const Topic = require('../../domain/entities/Topic');
const NotFoundError = require('../../domain/errors/NotFoundError');

class UpdateTopic {
  constructor({ topicRepository }) {
    this.topicRepository = topicRepository;
  }

  async execute(id, { title, description } = {}) {
    const existing = await this.topicRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Tema no encontrado.');
    }

    const merged = new Topic({
      id: existing.id,
      title: title !== undefined ? title : existing.title,
      description:
        description !== undefined ? description : existing.description,
      subjectId: existing.subjectId,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    });

    return this.topicRepository.update(id, {
      title: merged.title,
      description: merged.description,
    });
  }
}

module.exports = UpdateTopic;
