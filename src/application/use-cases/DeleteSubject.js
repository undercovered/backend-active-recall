const NotFoundError = require('../../domain/errors/NotFoundError');

/**
 * Use case: delete a subject by id.
 * Throws NotFoundError (404) if it does not exist.
 */
class DeleteSubject {
  /**
   * @param {{ subjectRepository: import('../../domain/repositories/SubjectRepository') }} deps
   */
  constructor({ subjectRepository }) {
    this.subjectRepository = subjectRepository;
  }

  /**
   * @param {string} id
   * @returns {Promise<{ id: string }>}
   */
  async execute(id) {
    const deleted = await this.subjectRepository.delete(id);
    if (!deleted) {
      throw new NotFoundError('Materia no encontrada.');
    }
    return { id };
  }
}

module.exports = DeleteSubject;
