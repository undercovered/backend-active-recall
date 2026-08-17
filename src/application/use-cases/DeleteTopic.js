const NotFoundError = require('../../domain/errors/NotFoundError');

class DeleteTopic {
  constructor({ topicRepository }) {
    this.topicRepository = topicRepository;
  }

  async execute(id) {
    const deleted = await this.topicRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError('Tema no encontrado.');
    }
    return { id };
  }
}

module.exports = DeleteTopic;
