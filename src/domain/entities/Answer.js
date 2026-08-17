const ValidationError = require('../errors/ValidationError');
const { asDeleted } = require('../flags');

/**
 * Answer entity (domain layer).
 * One option (or the open-text solution) that belongs to a flashcard.
 */
class Answer {
  /**
   * @param {object} params
   * @param {string} [params.id]
   * @param {string} params.answerText
   * @param {boolean} [params.isCorrect]
   * @param {string} params.flashcardId
   * @param {Date|string} [params.createdAt]
   * @param {Date|string} [params.updatedAt]
   */
  constructor({
    id,
    answerText,
    isCorrect = false,
    flashcardId,
    deleted = false,
    createdAt,
    updatedAt,
  }) {
    if (!answerText || String(answerText).trim().length === 0) {
      throw new ValidationError(
        'Answer.answerText is required and cannot be blank.',
      );
    }
    if (!flashcardId) {
      throw new ValidationError('Answer.flashcardId is required.');
    }

    this.id = id;
    this.answerText = String(answerText).trim();
    this.isCorrect = Boolean(isCorrect);
    this.flashcardId = flashcardId;
    this.deleted = asDeleted(deleted);
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromRow(row) {
    return new Answer({
      id: row.id,
      answerText: row.answer_text,
      isCorrect: row.is_correct,
      flashcardId: row.flashcard_id,
      deleted: row.deleted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  toJSON() {
    return {
      id: this.id,
      answerText: this.answerText,
      isCorrect: this.isCorrect,
      flashcardId: this.flashcardId,
      deleted: this.deleted,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = Answer;
