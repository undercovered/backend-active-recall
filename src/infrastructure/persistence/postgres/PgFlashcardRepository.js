const FlashcardRepository = require('../../../domain/repositories/FlashcardRepository');
const Flashcard = require('../../../domain/entities/Flashcard');

/**
 * PostgreSQL implementation of FlashcardRepository.
 */
class PgFlashcardRepository extends FlashcardRepository {
  /**
   * @param {import('pg').Pool} pool
   */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async findAll() {
    const { rows } = await this.pool.query(
      'SELECT * FROM flashcards ORDER BY created_at DESC',
    );
    return rows.map(Flashcard.fromRow);
  }

  async findByTopicId(topicId) {
    const { rows } = await this.pool.query(
      'SELECT * FROM flashcards WHERE topic_id = $1 ORDER BY created_at DESC',
      [topicId],
    );
    return rows.map(Flashcard.fromRow);
  }

  async findById(id) {
    const { rows } = await this.pool.query(
      'SELECT * FROM flashcards WHERE id = $1',
      [id],
    );
    return rows[0] ? Flashcard.fromRow(rows[0]) : null;
  }

  async create({ question, topicId }) {
    const { rows } = await this.pool.query(
      `INSERT INTO flashcards (question, topic_id)
       VALUES ($1, $2)
       RETURNING *`,
      [question, topicId],
    );
    return Flashcard.fromRow(rows[0]);
  }

  async update(id, { question }) {
    const { rows } = await this.pool.query(
      `UPDATE flashcards
       SET question = COALESCE($2, question)
       WHERE id = $1
       RETURNING *`,
      [id, question ?? null],
    );
    return rows[0] ? Flashcard.fromRow(rows[0]) : null;
  }

  async delete(id) {
    const { rowCount } = await this.pool.query(
      'DELETE FROM flashcards WHERE id = $1',
      [id],
    );
    return rowCount > 0;
  }
}

module.exports = PgFlashcardRepository;
