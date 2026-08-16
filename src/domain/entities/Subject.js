/**
 * Subject entity (domain layer).
 * Mirrors the `subjects` table and enforces its business rules:
 *   - title is required and must not be blank.
 */
const ValidationError = require('../errors/ValidationError');

class Subject {
  /**
   * @param {object} params
   * @param {string} [params.id]
   * @param {string} params.title
   * @param {string|null} [params.description]
   * @param {Date|string} [params.createdAt]
   * @param {Date|string} [params.updatedAt]
   */
  constructor({ id, title, description = null, createdAt, updatedAt }) {
    if (!title || String(title).trim().length === 0) {
      throw new ValidationError('Subject.title is required and cannot be blank.');
    }

    this.id = id;
    this.title = String(title).trim();
    this.description = description;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Maps a raw database row (snake_case) to a Subject entity.
   * @param {object} row
   * @returns {Subject}
   */
  static fromRow(row) {
    return new Subject({
      id: row.id,
      title: row.title,
      description: row.description,
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
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = Subject;
