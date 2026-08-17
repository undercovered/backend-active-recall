/**
 * Use case: list subjects, optionally filtered by title.
 */
class GetAllSubjects {
  /**
   * @param {{ subjectRepository: import('../../domain/repositories/SubjectRepository') }} deps
   */
  constructor({ subjectRepository }) {
    this.subjectRepository = subjectRepository;
  }

  /**
   * @param {{ search?: string }} [filters]
   * @returns {Promise<import('../../domain/entities/Subject')[]>}
   */
  async execute({ search } = {}) {
    return this.subjectRepository.findAll({ search });
  }
}

module.exports = GetAllSubjects;
