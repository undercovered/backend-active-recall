const ValidationError = require('../../domain/errors/ValidationError');
const NotFoundError = require('../../domain/errors/NotFoundError');
const { validateAnswers, hydrateFlashcard } = require('../questionAnswers');
const { assertTopicUnlocked } = require('../topicReviewLock');

class UpdateFlashcard {
  constructor({
    pool,
    flashcardRepository,
    topicRepository,
    answerRepository,
    answerTypeRepository,
    activeRecallRepository,
  }) {
    this.pool = pool;
    this.flashcardRepository = flashcardRepository;
    this.topicRepository = topicRepository;
    this.answerRepository = answerRepository;
    this.answerTypeRepository = answerTypeRepository;
    this.activeRecallRepository = activeRecallRepository;
  }

  async execute(id, { question, answerTypeCode, answers } = {}) {
    const card = await this.flashcardRepository.findById(id);
    if (!card) {
      throw new NotFoundError('Pregunta no encontrada.');
    }
    await assertTopicUnlocked(this.activeRecallRepository, card.topicId);

    const text =
      question === undefined ? card.question : String(question ?? '').trim();
    if (!text) {
      throw new ValidationError('La pregunta es obligatoria.');
    }

    let type = await this.answerTypeRepository.findById(card.answerTypeId);
    if (answerTypeCode !== undefined) {
      type = await this.answerTypeRepository.findByCode(
        String(answerTypeCode ?? '').trim(),
      );
      if (!type) {
        throw new ValidationError(
          'El tipo de respuesta es obligatorio y debe ser válido.',
        );
      }
    }

    const replaceAnswers = Array.isArray(answers);
    const cleaned = replaceAnswers ? validateAnswers(type.code, answers) : null;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const updated =
        (await this.flashcardRepository.update(
          id,
          { question: text, answerTypeId: type.id },
          client,
        )) ?? card;

      let saved = await this.answerRepository.findByFlashcardId(id, client);
      if (replaceAnswers) {
        await this.answerRepository.softDeleteByFlashcardId(id, client);
        saved = [];
        for (const option of cleaned) {
          saved.push(
            await this.answerRepository.create(
              {
                answerText: option.answerText,
                isCorrect: option.isCorrect,
                flashcardId: updated.id,
                topicId: updated.topicId,
                subjectId: updated.subjectId,
              },
              client,
            ),
          );
        }
      }
      await client.query('COMMIT');

      const topic = await this.topicRepository.findById(updated.topicId);
      return hydrateFlashcard(updated, type, saved, {
        topicTitle: topic?.title,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = UpdateFlashcard;
