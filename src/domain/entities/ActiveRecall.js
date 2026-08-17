const ValidationError = require('../errors/ValidationError');
const { asDeleted, asCompleted } = require('../flags');

/**
 * ActiveRecall entity (domain layer).
 * One planned review date for a topic. `completed` is false until the
 * learner has answered every question of that topic (right or wrong).
 */
class ActiveRecall {
  /**
   * @param {object} params
   * @param {string} [params.id]
   * @param {Date|string} params.dateRecall
   * @param {boolean} [params.completed]
   * @param {string} params.topicId
   * @param {string} params.subjectId
   * @param {Date|string} [params.createdAt]
   * @param {Date|string} [params.updatedAt]
   */
  constructor({
    id,
    dateRecall,
    completed = false,
    topicId,
    subjectId,
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
    if (!subjectId) {
      throw new ValidationError('ActiveRecall.subjectId is required.');
    }

    this.id = id;
    this.dateRecall = dateRecall;
    this.completed = asCompleted(completed);
    this.topicId = topicId;
    this.subjectId = subjectId;
    this.deleted = asDeleted(deleted);
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static fromRow(row) {
    return new ActiveRecall({
      id: row.id,
      dateRecall: row.date_recall,
      completed: row.completed,
      topicId: row.topic_id,
      subjectId: row.subject_id,
      deleted: row.deleted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  toJSON() {
    return {
      id: this.id,
      dateRecall: this.dateRecall,
      completed: this.completed,
      topicId: this.topicId,
      subjectId: this.subjectId,
      deleted: this.deleted,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = ActiveRecall;
