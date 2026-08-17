const ValidationError = require('../../domain/errors/ValidationError');
const NotFoundError = require('../../domain/errors/NotFoundError');

const OPEN = 'open_answer';
const SINGLE = 'single_choice';
const MULTIPLE = 'multiple_choice';

/**
 * Submit an answer for a flashcard in today's recall attempt.
 * Choice types are auto-graded. Open answers wait for a self-grade.
 */
class SubmitReviewAnswer {
  constructor({
    pool,
    activeRecallRepository,
    flashcardRepository,
    answerRepository,
    answerTypeRepository,
    userAnswerRepository,
  }) {
    this.pool = pool;
    this.activeRecallRepository = activeRecallRepository;
    this.flashcardRepository = flashcardRepository;
    this.answerRepository = answerRepository;
    this.answerTypeRepository = answerTypeRepository;
    this.userAnswerRepository = userAnswerRepository;
  }

  async execute({
    recallId,
    flashcardId,
    answerIds = [],
    openResponse = null,
  } = {}) {
    const recall = await this.activeRecallRepository.findById(recallId);
    if (!recall) {
      throw new NotFoundError('Repaso no encontrado.');
    }
    if (recall.completed) {
      throw new ValidationError(
        'Este tema ya fue respondido. Podrás volver a intentarlo en el próximo repaso.',
      );
    }

    const flashcard = await this.flashcardRepository.findById(flashcardId);
    if (!flashcard || flashcard.topicId !== recall.topic_id) {
      throw new NotFoundError('Pregunta no encontrada en este tema.');
    }

    const existing = (await this.userAnswerRepository.findByAttemptId(recallId))
      .filter((ua) => ua.flashcardId === flashcardId);
    if (existing.some((ua) => ua.isCorrect !== null)) {
      throw new ValidationError(
        'Ya respondiste esta pregunta. No puedes cambiarla hasta el próximo repaso.',
      );
    }
    if (existing.length) {
      throw new ValidationError(
        'Ya enviaste esta respuesta. Califica si fue correcta o incorrecta.',
      );
    }

    const answerType = await this.answerTypeRepository.findById(
      flashcard.answerTypeId,
    );
    const options = await this.answerRepository.findByFlashcardId(flashcardId);
    const code = answerType?.code;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      let result;

      if (code === OPEN) {
        result = await this.#saveOpen({
          client,
          recall,
          flashcard,
          options,
          openResponse,
        });
      } else {
        result = await this.#saveChoice({
          client,
          recall,
          flashcard,
          options,
          code,
          answerIds,
        });
      }

      if (result.status === 'graded') {
        await this.#maybeCloseRecall(client, recall, flashcard.topicId);
      }

      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async #saveOpen({ client, recall, flashcard, options, openResponse }) {
    const text = String(openResponse ?? '').trim();
    if (!text) {
      throw new ValidationError('Escribe tu respuesta antes de continuar.');
    }
    const expected = options.find((a) => a.isCorrect) ?? options[0];
    await this.userAnswerRepository.create(
      {
        attemptId: recall.id,
        flashcardId: flashcard.id,
        openResponse: text,
        subjectId: recall.subject_id,
        topicId: recall.topic_id,
        isCorrect: null,
      },
      client,
    );
    return {
      flashcardId: flashcard.id,
      status: 'awaiting_grade',
      isCorrect: null,
      expectedText: expected?.answerText ?? '',
      openResponse: text,
    };
  }

  async #saveChoice({ client, recall, flashcard, options, code, answerIds }) {
    const selected = [...new Set((Array.isArray(answerIds) ? answerIds : []).filter(Boolean))];
    if (!selected.length) {
      throw new ValidationError('Selecciona al menos una respuesta.');
    }

    const validIds = new Set(options.map((o) => o.id));
    if (selected.some((id) => !validIds.has(id))) {
      throw new ValidationError('Hay una opción inválida.');
    }

    const correctIds = options.filter((o) => o.isCorrect).map((o) => o.id).sort();
    const picked = [...selected].sort();
    let isCorrect = false;
    if (code === SINGLE) {
      if (selected.length !== 1) {
        throw new ValidationError('Selecciona una sola respuesta.');
      }
      isCorrect = correctIds.length === 1 && selected[0] === correctIds[0];
    } else if (code === MULTIPLE) {
      isCorrect =
        picked.length === correctIds.length &&
        picked.every((id, i) => id === correctIds[i]);
    } else {
      throw new ValidationError('Tipo de respuesta no soportado.');
    }

    for (const answerId of selected) {
      await this.userAnswerRepository.create(
        {
          attemptId: recall.id,
          flashcardId: flashcard.id,
          answerId,
          subjectId: recall.subject_id,
          topicId: recall.topic_id,
          isCorrect,
        },
        client,
      );
    }

    return {
      flashcardId: flashcard.id,
      status: 'graded',
      isCorrect,
      selectedAnswerIds: selected,
      correctAnswerIds: isCorrect ? [] : correctIds,
    };
  }

  async #maybeCloseRecall(client, recall, topicId) {
    const cards = await this.flashcardRepository.findByTopicId(topicId, client);
    const attempts = await this.userAnswerRepository.findByAttemptId(
      recall.id,
      client,
    );
    const graded = new Map();
    for (const ua of attempts) {
      if (ua.isCorrect !== null) {
        graded.set(ua.flashcardId, ua.isCorrect);
      }
    }
    if (!cards.length || cards.some((c) => !graded.has(c.id))) {
      return;
    }
    await this.activeRecallRepository.markCompleted(recall.id, client);
  }
}

module.exports = SubmitReviewAnswer;
