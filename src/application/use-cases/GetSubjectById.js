const NotFoundError = require('../../domain/errors/NotFoundError');

/**
 * Use case: fetch a single subject by id.
 * Throws NotFoundError (404) if it does not exist.
 */
class GetSubjectById {
  /**
   * @param {{ subjectRepository: import('../../domain/repositories/SubjectRepository') }} deps
   */
  constructor({ subjectRepository }) {
    this.subjectRepository = subjectRepository;
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../../domain/entities/Subject')>}
   */
  async execute(id) {
    const subject = await this.subjectRepository.findById(id);
    if (!subject) {
      throw new NotFoundError('Materia no encontrada.');
    }
    return subject;
  }
}

module.exports = GetSubjectById;
