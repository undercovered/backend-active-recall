const ValidationError = require('../errors/ValidationError');
const { asDeleted } = require('../flags');

/**
 * ActiveRecall entity (domain layer).
 * One planned review date for a topic. `correctAnswer` stays null until
 * the learner actually reviews that date.
 */
class ActiveRecall {
  /**
   * @param {object} params
   * @param {string} [params.id]
   * @param {Date|string} params.dateRecall
   * @param {boolean|null} [params.correctAnswer]
   * @param {string} params.topicId
   * @param {Date|string} [params.createdAt]
   * @param {Date|string} [params.updatedAt]
   */
  constructor({
    id,
    dateRecall,
    correctAnswer = null,
    topicId,
    deleted = false,
    createdAt,
    updatedAt,
  }) {
    if (!dateRecall) {
      throw new ValidationError('ActiveRecall.dateRecall is required.');
    }
    if (!topicId) {
      throw new ValidationError('ActiveRecall.topicId is required.');
    }

    this.id = id;
    this.dateRecall = dateRecall;
    this.correctAnswer = correctAnswer;
    this.topicId = topicId;
    this.deleted = asDeleted(deleted);
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromRow(row) {
    return new ActiveRecall({
      id: row.id,
      dateRecall: row.date_recall,
      correctAnswer: row.correct_answer,
      topicId: row.topic_id,
      deleted: row.deleted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  toJSON() {
    return {
      id: this.id,
      dateRecall: this.dateRecall,
      correctAnswer: this.correctAnswer,
      topicId: this.topicId,
      deleted: this.deleted,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = ActiveRecall;
