class ActiveRecallRepository {
  async findByTopicId(topicId) {
    throw new Error('ActiveRecallRepository.findByTopicId() not implemented.');
  }

  async createMany(items, client) {
    throw new Error('ActiveRecallRepository.createMany() not implemented.');
  }

  async countDueOn(date) {
    throw new Error('ActiveRecallRepository.countDueOn() not implemented.');
  }

  async findDueOn(date) {
    throw new Error('ActiveRecallRepository.findDueOn() not implemented.');
  }

  async findById(id) {
    throw new Error('ActiveRecallRepository.findById() not implemented.');
  }

  async markResult(id, correctAnswer, client) {
    throw new Error('ActiveRecallRepository.markResult() not implemented.');
  }
}

module.exports = ActiveRecallRepository;
