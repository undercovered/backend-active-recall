const ValidationError = require('../../domain/errors/ValidationError');
const NotFoundError = require('../../domain/errors/NotFoundError');

/**
 * Self-grade an open-answer flashcard after the card has flipped.
 */
class GradeOpenAnswer {
  constructor({
    pool,
    activeRecallRepository,
    flashcardRepository,
    userAnswerRepository,
  }) {
    this.pool = pool;
    this.activeRecallRepository = activeRecallRepository;
    this.flashcardRepository = flashcardRepository;
    this.userAnswerRepository = userAnswerRepository;
  }

  async execute({ recallId, flashcardId, isCorrect } = {}) {
    if (typeof isCorrect !== 'boolean') {
      throw new ValidationError('Indica si la respuesta fue correcta o incorrecta.');
    }

    const recall = await this.activeRecallRepository.findById(recallId);
    if (!recall) {
      throw new NotFoundError('Repaso no encontrado.');
    }
    if (recall.completed) {
      throw new ValidationError(
        'Este tema ya fue respondido. Podrás volver a intentarlo en el próximo repaso.',
      );
    }

    const existing = (await this.userAnswerRepository.findByAttemptId(recallId))
      .filter((ua) => ua.flashcardId === flashcardId);
    if (!existing.length) {
      throw new ValidationError('Primero escribe y envía tu respuesta.');
    }
    if (existing.some((ua) => ua.isCorrect !== null)) {
      throw new ValidationError(
        'Ya calificaste esta pregunta. No puedes cambiarla hasta el próximo repaso.',
      );
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await this.userAnswerRepository.setCorrect(
        recallId,
        flashcardId,
        isCorrect,
        client,
      );

      const cards = await this.flashcardRepository.findByTopicId(
        recall.topic_id,
        client,
      );
      const attempts = await this.userAnswerRepository.findByAttemptId(
        recallId,
        client,
      );
      const graded = new Map();
      for (const ua of attempts) {
        if (ua.isCorrect !== null) {
          graded.set(ua.flashcardId, ua.isCorrect);
        }
      }
      if (cards.length && cards.every((c) => graded.has(c.id))) {
        await this.activeRecallRepository.markCompleted(recall.id, client);
      }

      await client.query('COMMIT');
      return {
        flashcardId,
        status: 'graded',
        isCorrect,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = GradeOpenAnswer;
