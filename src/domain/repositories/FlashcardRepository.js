/**
 * FlashcardRepository (port / interface).
 *
 * Database-agnostic contract for persisting Flashcard entities.
 * See SubjectRepository for the rationale behind this abstraction.
 */
class FlashcardRepository {
  /**
   * @returns {Promise<import('../entities/Flashcard')[]>}
   */
  async findAll() {
    throw new Error('FlashcardRepository.findAll() not implemented.');
  }

  /**
   * @param {string} topicId
   * @returns {Promise<import('../entities/Flashcard')[]>}
   */
  async findByTopicId(topicId) {
    throw new Error('FlashcardRepository.findByTopicId() not implemented.');
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../entities/Flashcard')|null>}
   */
  async findById(id) {
    throw new Error('FlashcardRepository.findById() not implemented.');
  }

  /**
   * @param {{ question: string, topicId: string, subjectId: string, answerTypeId: string }} data
   * @returns {Promise<import('../entities/Flashcard')>}
   */
  async create(data, client) {
    throw new Error('FlashcardRepository.create() not implemented.');
  }

  /**
   * @param {string} id
   * @param {{ question?: string }} changes
   * @returns {Promise<import('../entities/Flashcard')|null>}
   */
  async update(id, changes) {
    throw new Error('FlashcardRepository.update() not implemented.');
  }

  /**
   * @param {string} id
   * @returns {Promise<boolean>} true if a row was deleted.
   */
  async delete(id) {
    throw new Error('FlashcardRepository.delete() not implemented.');
  }
}

module.exports = FlashcardRepository;
