/**
 * Topic entity (domain layer).
 * Mirrors the `topics` table and enforces its business rules:
 *   - title is required and must not be blank.
 *   - subjectId is required (FK to subjects.id).
 */
const ValidationError = require('../errors/ValidationError');

class Topic {
  /**
   * @param {object} params
   * @param {string} [params.id]
   * @param {string} params.title
   * @param {string|null} [params.description]
   * @param {string} params.subjectId
   * @param {Date|string} [params.createdAt]
   * @param {Date|string} [params.updatedAt]
   */
  constructor({ id, title, description = null, subjectId, createdAt, updatedAt }) {
    if (!title || String(title).trim().length === 0) {
      throw new ValidationError('Topic.title is required and cannot be blank.');
    }
    if (!subjectId) {
      throw new ValidationError('Topic.subjectId is required.');
    }

    this.id = id;
    this.title = String(title).trim();
    this.description = description;
    this.subjectId = subjectId;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Maps a raw database row (snake_case) to a Topic entity.
   * @param {object} row
   * @returns {Topic}
   */
  static fromRow(row) {
    return new Topic({
      id: row.id,
      title: row.title,
      description: row.description,
      subjectId: row.subject_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  /**
   * Serializes the entity for API responses.
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      subjectId: this.subjectId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = Topic;
