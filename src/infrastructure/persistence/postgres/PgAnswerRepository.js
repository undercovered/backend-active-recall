const AnswerRepository = require('../../../domain/repositories/AnswerRepository');
const Answer = require('../../../domain/entities/Answer');

class PgAnswerRepository extends AnswerRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  db(client) {
    return client ?? this.pool;
  }

  async findByFlashcardId(flashcardId) {
    const { rows } = await this.pool.query(
      'SELECT * FROM answers WHERE flashcard_id = $1 AND deleted = false ORDER BY created_at ASC',
      [flashcardId],
    );
    return rows.map(Answer.fromRow);
  }

  async findByFlashcardIds(flashcardIds) {
    if (!flashcardIds.length) {
      return [];
    }
    const { rows } = await this.pool.query(
      'SELECT * FROM answers WHERE flashcard_id = ANY($1::uuid[]) AND deleted = false ORDER BY created_at ASC',
      [flashcardIds],
    );
    return rows.map(Answer.fromRow);
  }

  async create({ answerText, isCorrect = false, flashcardId }, client) {
    const { rows } = await this.db(client).query(
      `INSERT INTO answers (answer_text, is_correct, flashcard_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [answerText, isCorrect, flashcardId],
    );
    return Answer.fromRow(rows[0]);
  }
}

module.exports = PgAnswerRepository;
