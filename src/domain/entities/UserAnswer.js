const { asDeleted } = require('../flags');

class UserAnswer {
  constructor({
    id,
    attemptId,
    flashcardId,
    answerId = null,
    openResponse = null,
    subjectId,
    topicId,
    isCorrect = null,
    deleted = false,
    createdAt,
  }) {
    this.id = id;
    this.attemptId = attemptId;
    this.flashcardId = flashcardId;
    this.answerId = answerId;
    this.openResponse = openResponse;
    this.subjectId = subjectId;
    this.topicId = topicId;
    this.isCorrect = isCorrect;
    this.deleted = asDeleted(deleted);
    this.createdAt = createdAt;
  }

  static fromRow(row) {
    return new UserAnswer({
      id: row.id,
      attemptId: row.attempt_id,
      flashcardId: row.flashcard_id,
      answerId: row.answer_id,
      openResponse: row.open_response,
      subjectId: row.subject_id,
      topicId: row.topic_id,
      isCorrect: row.is_correct,
      deleted: row.deleted,
      createdAt: row.created_at,
    });
  }

  toJSON() {
    return {
      id: this.id,
      attemptId: this.attemptId,
      flashcardId: this.flashcardId,
      answerId: this.answerId,
      openResponse: this.openResponse,
      subjectId: this.subjectId,
      topicId: this.topicId,
      isCorrect: this.isCorrect,
      deleted: this.deleted,
      createdAt: this.createdAt,
    };
  }
}

module.exports = UserAnswer;
