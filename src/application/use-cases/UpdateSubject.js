const Subject = require('../../domain/entities/Subject');
const NotFoundError = require('../../domain/errors/NotFoundError');

/**
 * Use case: update an existing subject's title/description.
 * - 404 if it does not exist.
 * - ValidationError (400) if the resulting title would be blank.
 */
class UpdateSubject {
  /**
   * @param {{ subjectRepository: import('../../domain/repositories/SubjectRepository') }} deps
   */
  constructor({ subjectRepository }) {
    this.subjectRepository = subjectRepository;
  }

  /**
   * @param {string} id
   * @param {{ title?: string, description?: string|null }} changes
   * @returns {Promise<import('../../domain/entities/Subject')>}
   */
  async execute(id, { title, description } = {}) {
    const existing = await this.subjectRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Materia no encontrada.');
    }

    // Resolve final values (keep current when a field is not provided) and
    // reuse the entity invariants to validate & normalize (e.g. non-blank title).
    const merged = new Subject({
      id: existing.id,
      title: title !== undefined ? title : existing.title,
      description: description !== undefined ? description : existing.description,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    });

    return this.subjectRepository.update(id, {
      title: merged.title,
      description: merged.description,
    });
  }
}

module.exports = UpdateSubject;
