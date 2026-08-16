/**
 * SubjectRepository (port / interface).
 *
 * This is a database-agnostic contract. The domain and application layers
 * depend ONLY on this abstraction, never on a concrete database driver.
 * To switch databases, provide a new implementation of this interface;
 * nothing else in the codebase needs to change.
 *
 * Every method returns/accepts domain entities (Subject), never raw rows.
 */
class SubjectRepository {
  /**
   * @returns {Promise<import('../entities/Subject')[]>}
   */
  async findAll() {
    throw new Error('SubjectRepository.findAll() not implemented.');
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../entities/Subject')|null>}
   */
  async findById(id) {
    throw new Error('SubjectRepository.findById() not implemented.');
  }

  /**
   * @param {{ title: string, description?: string|null }} data
   * @returns {Promise<import('../entities/Subject')>}
   */
  async create(data) {
    throw new Error('SubjectRepository.create() not implemented.');
  }

  /**
   * @param {string} id
   * @param {{ title?: string, description?: string|null }} changes
   * @returns {Promise<import('../entities/Subject')|null>}
   */
  async update(id, changes) {
    throw new Error('SubjectRepository.update() not implemented.');
  }

  /**
   * @param {string} id
   * @returns {Promise<boolean>} true if a row was deleted.
   */
  async delete(id) {
    throw new Error('SubjectRepository.delete() not implemented.');
  }
}

module.exports = SubjectRepository;
