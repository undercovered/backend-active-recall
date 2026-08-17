/**
 * Use case: list topics, optionally filtered by subject and title.
 */
class GetAllTopics {
  constructor({ topicRepository }) {
    this.topicRepository = topicRepository;
  }

  /**
   * @param {{ search?: string, subjectId?: string }} [filters]
   */
  async execute({ search, subjectId } = {}) {
    return this.topicRepository.findAll({ search, subjectId });
  }
}

module.exports = GetAllTopics;
