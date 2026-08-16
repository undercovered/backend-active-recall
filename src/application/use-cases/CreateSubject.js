const Subject = require('../../domain/entities/Subject');

/**
 * Use case: create a new Subject.
 *
 * Orchestrates the domain and the persistence port. It does NOT know about
 * Express or PostgreSQL — it only depends on the SubjectRepository abstraction,
 * injected via the constructor.
 */
class CreateSubject {
  /**
   * @param {{ subjectRepository: import('../../domain/repositories/SubjectRepository') }} deps
   */
  constructor({ subjectRepository }) {
    this.subjectRepository = subjectRepository;
  }

  /**
   * @param {{ title: string, description?: string|null }} input
   * @returns {Promise<Subject>}
   */
  async execute({ title, description = null } = {}) {
    // Reuse the entity's invariants to validate and normalize the input
    // (throws ValidationError if title is missing/blank).
    const draft = new Subject({ title, description });

    return this.subjectRepository.create({
      title: draft.title,
      description: draft.description,
    });
  }
}

module.exports = CreateSubject;
