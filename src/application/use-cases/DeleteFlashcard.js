const NotFoundError = require('../../domain/errors/NotFoundError');
const { assertTopicUnlocked } = require('../topicReviewLock');

class DeleteFlashcard {
  constructor({ flashcardRepository, activeRecallRepository }) {
    this.flashcardRepository = flashcardRepository;
    this.activeRecallRepository = activeRecallRepository;
  }

  async execute(id) {
    const card = await this.flashcardRepository.findById(id);
    if (!card) {
      throw new NotFoundError('Pregunta no encontrada.');
    }
    await assertTopicUnlocked(this.activeRecallRepository, card.topicId);
    const deleted = await this.flashcardRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError('Pregunta no encontrada.');
    }
    return { id };
  }
}

module.exports = DeleteFlashcard;
