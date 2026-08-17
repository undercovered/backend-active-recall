const Topic = require('../../domain/entities/Topic');
const ValidationError = require('../../domain/errors/ValidationError');
const NotFoundError = require('../../domain/errors/NotFoundError');
const { buildRecallDates } = require('../../domain/recallSchedule');

const OPEN = 'open_answer';
const SINGLE = 'single_choice';
const MULTIPLE = 'multiple_choice';

/**
 * Use case: create a topic with N flashcards (questions + answers)
 * and the 7-step active-recall schedule. Runs in a single transaction.
 */
class CreateTopic {
  constructor({
    pool,
    topicRepository,
    subjectRepository,
    flashcardRepository,
    answerRepository,
    answerTypeRepository,
    activeRecallRepository,
  }) {
    this.pool = pool;
    this.topicRepository = topicRepository;
    this.subjectRepository = subjectRepository;
    this.flashcardRepository = flashcardRepository;
    this.answerRepository = answerRepository;
    this.answerTypeRepository = answerTypeRepository;
    this.activeRecallRepository = activeRecallRepository;
  }

  /**
   * @param {{
   *   title: string,
   *   description?: string|null,
   *   subjectId: string,
   *   questions?: { question: string, answerTypeCode: string, answers?: object[] }[],
   *   question?: string,
   *   answerTypeCode?: string,
   *   answers?: object[],
   * }} input
   */
  async execute({
    title,
    description = null,
    subjectId,
    questions,
    question,
    answerTypeCode,
    answers = [],
  } = {}) {
    const draft = new Topic({ title, description, subjectId });

    const subject = await this.subjectRepository.findById(draft.subjectId);
    if (!subject) {
      throw new NotFoundError('Materia no encontrada.');
    }

    const drafts = this.#normalizeQuestions({
      questions,
      question,
      answerTypeCode,
      answers,
    });
    if (drafts.length === 0) {
      throw new ValidationError('Agrega al menos una pregunta.');
    }

    const prepared = [];
    for (const item of drafts) {
      const type = await this.answerTypeRepository.findByCode(item.answerTypeCode);
      if (!type) {
        throw new ValidationError(
          'El tipo de respuesta es obligatorio y debe ser válido.',
        );
      }
      prepared.push({
        question: item.question,
        answerType: type,
        answers: this.#validateAnswers(type.code, item.answers),
      });
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const topic = await this.topicRepository.create(
        {
          title: draft.title,
          description: draft.description,
          subjectId: draft.subjectId,
        },
        client,
      );

      const flashcards = [];
      for (const item of prepared) {
        const flashcard = await this.flashcardRepository.create(
          {
            question: item.question,
            topicId: topic.id,
            answerTypeId: item.answerType.id,
          },
          client,
        );

        const savedAnswers = [];
        for (const option of item.answers) {
          savedAnswers.push(
            await this.answerRepository.create(
              {
                answerText: option.answerText,
                isCorrect: option.isCorrect,
                flashcardId: flashcard.id,
              },
              client,
            ),
          );
        }

        flashcards.push({
          ...flashcard.toJSON(),
          answerType: item.answerType.toJSON(),
          answers: savedAnswers.map((a) => a.toJSON()),
        });
      }

      const recalls = await this.activeRecallRepository.createMany(
        buildRecallDates(new Date()).map((dateRecall) => ({
          dateRecall,
          correctAnswer: null,
          topicId: topic.id,
        })),
        client,
      );

      await client.query('COMMIT');

      return {
        ...topic.toJSON(),
        flashcard: flashcards[0] ?? null,
        flashcards,
        recalls: recalls.map((r) => r.toJSON()),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  #normalizeQuestions({ questions, question, answerTypeCode, answers }) {
    if (Array.isArray(questions) && questions.length > 0) {
      return questions.map((item) => ({
        question: String(item?.question ?? '').trim(),
        answerTypeCode: String(item?.answerTypeCode ?? '').trim(),
        answers: item?.answers ?? [],
      })).filter((item) => item.question.length > 0);
    }

    const text = String(question ?? '').trim();
    if (!text) {
      return [];
    }
    return [
      {
        question: text,
        answerTypeCode: String(answerTypeCode ?? '').trim(),
        answers,
      },
    ];
  }

  #validateAnswers(code, answers) {
    const list = Array.isArray(answers) ? answers : [];
    const cleaned = list
      .map((a) => ({
        answerText: String(a?.answerText ?? '').trim(),
        isCorrect: Boolean(a?.isCorrect),
      }))
      .filter((a) => a.answerText.length > 0);

    if (code === OPEN) {
      if (cleaned.length === 0) {
        throw new ValidationError('La respuesta abierta es obligatoria.');
      }
      return [{ answerText: cleaned[0].answerText, isCorrect: true }];
    }

    if (cleaned.length < 2) {
      throw new ValidationError(
        'Debes agregar al menos dos opciones de respuesta.',
      );
    }

    const correctCount = cleaned.filter((a) => a.isCorrect).length;
    if (code === SINGLE && correctCount !== 1) {
      throw new ValidationError(
        'Selecciona exactamente una respuesta correcta.',
      );
    }
    if (code === MULTIPLE && correctCount < 1) {
      throw new ValidationError(
        'Marca al menos una respuesta correcta.',
      );
    }

    return cleaned;
  }
}

module.exports = CreateTopic;
