const ValidationError = require('../../domain/errors/ValidationError');
const NotFoundError = require('../../domain/errors/NotFoundError');
const { validateAnswers, hydrateFlashcard } = require('../questionAnswers');
const { assertTopicUnlocked } = require('../topicReviewLock');

class CreateFlashcard {
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

  async execute({ topicId, question, answerTypeCode, answers = [] } = {}) {
    const text = String(question ?? '').trim();
    if (!text) {
      throw new ValidationError('La pregunta es obligatoria.');
    }
    if (!topicId) {
      throw new ValidationError('Selecciona un tema.');
    }

    const topic = await this.topicRepository.findById(topicId);
    if (!topic) {
      throw new NotFoundError('Tema no encontrado.');
    }
    await assertTopicUnlocked(this.activeRecallRepository, topic.id);

    const type = await this.answerTypeRepository.findByCode(
      String(answerTypeCode ?? '').trim(),
    );
    if (!type) {
      throw new ValidationError(
        'El tipo de respuesta es obligatorio y debe ser válido.',
      );
    }
    const cleaned = validateAnswers(type.code, answers);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const flashcard = await this.flashcardRepository.create(
        {
          question: text,
          topicId: topic.id,
          subjectId: topic.subjectId,
          answerTypeId: type.id,
        },
        client,
      );
      const saved = [];
      for (const option of cleaned) {
        saved.push(
          await this.answerRepository.create(
            {
              answerText: option.answerText,
              isCorrect: option.isCorrect,
              flashcardId: flashcard.id,
              topicId: topic.id,
              subjectId: topic.subjectId,
            },
            client,
          ),
        );
      }
      await client.query('COMMIT');
      const subject = this.subjectRepository
        ? await this.subjectRepository.findById(topic.subjectId)
        : null;
      return hydrateFlashcard(flashcard, type, saved, {
        topicTitle: topic.title,
        subjectTitle: subject?.title,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = CreateFlashcard;
