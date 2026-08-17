const UserAnswerRepository = require('../../../domain/repositories/UserAnswerRepository');
const UserAnswer = require('../../../domain/entities/UserAnswer');

class PgUserAnswerRepository extends UserAnswerRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  db(client) {
    return client ?? this.pool;
  }

  async findByAttemptId(attemptId, client) {
    const { rows } = await this.db(client).query(
      'SELECT * FROM user_answers WHERE attempt_id = $1 AND deleted = false ORDER BY created_at ASC',
      [attemptId],
    );
    return rows.map(UserAnswer.fromRow);
  }

  async findByAttemptIds(attemptIds) {
    if (!attemptIds.length) {
      return [];
    }
    const { rows } = await this.pool.query(
      'SELECT * FROM user_answers WHERE attempt_id = ANY($1::uuid[]) AND deleted = false',
      [attemptIds],
    );
    return rows.map(UserAnswer.fromRow);
  }

  async create(
    {
      attemptId,
      flashcardId,
      answerId = null,
      openResponse = null,
      subjectId,
      topicId,
      isCorrect = null,
    },
    client,
  ) {
    const { rows } = await this.db(client).query(
      `INSERT INTO user_answers
         (attempt_id, flashcard_id, answer_id, open_response, subject_id, topic_id, is_correct)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        attemptId,
        flashcardId,
        answerId,
        openResponse,
        subjectId,
        topicId,
        isCorrect,
      ],
    );
    return UserAnswer.fromRow(rows[0]);
  }

  async setCorrect(attemptId, flashcardId, isCorrect, client) {
    const { rows } = await this.db(client).query(
      `UPDATE user_answers
       SET is_correct = $3
       WHERE attempt_id = $1 AND flashcard_id = $2 AND deleted = false
       RETURNING *`,
      [attemptId, flashcardId, isCorrect],
    );
    return rows.map(UserAnswer.fromRow);
  }
}

module.exports = PgUserAnswerRepository;
