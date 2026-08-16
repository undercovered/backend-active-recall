/**
 * TopicRepository (port / interface).
 *
 * Database-agnostic contract for persisting Topic entities.
 * See SubjectRepository for the rationale behind this abstraction.
 */
class TopicRepository {
  /**
   * @returns {Promise<import('../entities/Topic')[]>}
   */
  async findAll() {
    throw new Error('TopicRepository.findAll() not implemented.');
  }

  /**
   * @param {string} subjectId
   * @returns {Promise<import('../entities/Topic')[]>}
   */
  async findBySubjectId(subjectId) {
    throw new Error('TopicRepository.findBySubjectId() not implemented.');
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../entities/Topic')|null>}
   */
  async findById(id) {
    throw new Error('TopicRepository.findById() not implemented.');
  }

  /**
   * @param {{ title: string, description?: string|null, subjectId: string }} data
   * @returns {Promise<import('../entities/Topic')>}
   */
  async create(data) {
    throw new Error('TopicRepository.create() not implemented.');
  }

  /**
   * @param {string} id
   * @param {{ title?: string, description?: string|null }} changes
   * @returns {Promise<import('../entities/Topic')|null>}
   */
  async update(id, changes) {
    throw new Error('TopicRepository.update() not implemented.');
  }

  /**
   * @param {string} id
   * @returns {Promise<boolean>} true if a row was deleted.
   */
  async delete(id) {
    throw new Error('TopicRepository.delete() not implemented.');
  }
}

module.exports = TopicRepository;
