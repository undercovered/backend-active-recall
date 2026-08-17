/**
 * Flashcard entity (domain layer).
 * Mirrors the `flashcards` table and enforces its business rules:
 *   - question is required and must not be blank.
 *   - topicId is required (FK to topics.id).
 *   - answerTypeId is required (FK to answer_types.id).
 */
const ValidationError = require('../errors/ValidationError');
const { asDeleted } = require('../flags');

class Flashcard {
  /**
   * @param {object} params
   * @param {string} [params.id]
   * @param {string} params.question
   * @param {string} params.topicId
   * @param {string} params.answerTypeId
   * @param {Date|string} [params.createdAt]
   * @param {Date|string} [params.updatedAt]
   */
  constructor({
    id,
    question,
    topicId,
    answerTypeId,
    deleted = false,
    createdAt,
    updatedAt,
  }) {
    if (!question || String(question).trim().length === 0) {
      throw new ValidationError(
        'Flashcard.question is required and cannot be blank.',
      );
    }
    if (!topicId) {
      throw new ValidationError('Flashcard.topicId is required.');
    }
    if (!answerTypeId) {
      throw new ValidationError('Flashcard.answerTypeId is required.');
    }

    this.id = id;
    this.question = String(question).trim();
    this.topicId = topicId;
    this.answerTypeId = answerTypeId;
    this.deleted = asDeleted(deleted);
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Maps a raw database row (snake_case) to a Flashcard entity.
   * @param {object} row
   * @returns {Flashcard}
   */
  static fromRow(row) {
    return new Flashcard({
      id: row.id,
      question: row.question,
      topicId: row.topic_id,
      answerTypeId: row.answer_type_id,
      deleted: row.deleted,
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
      question: this.question,
      topicId: this.topicId,
      answerTypeId: this.answerTypeId,
      deleted: this.deleted,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = Flashcard;
