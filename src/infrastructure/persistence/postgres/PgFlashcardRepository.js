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

  db(client) {
    return client ?? this.pool;
  }

  async findAll() {
    const { rows } = await this.pool.query(
      `SELECT f.*
       FROM flashcards f
       JOIN topics t ON t.id = f.topic_id AND t.deleted = false
       JOIN subjects s ON s.id = f.subject_id AND s.deleted = false
       WHERE f.deleted = false
       ORDER BY f.created_at DESC`,
    );
    return rows.map(Flashcard.fromRow);
  }

  async findByTopicId(topicId, client) {
    const { rows } = await this.db(client).query(
      'SELECT * FROM flashcards WHERE topic_id = $1 AND deleted = false ORDER BY created_at DESC',
      [topicId],
    );
    return rows.map(Flashcard.fromRow);
  }

  async findByTopicIds(topicIds) {
    if (!topicIds.length) {
      return [];
    }
    const { rows } = await this.pool.query(
      `SELECT f.*, at.code AS answer_type_code, at.name AS answer_type_name
       FROM flashcards f
       JOIN answer_types at ON at.id = f.answer_type_id AND at.deleted = false
       JOIN topics t ON t.id = f.topic_id AND t.deleted = false
       JOIN subjects s ON s.id = f.subject_id AND s.deleted = false
       WHERE f.topic_id = ANY($1::uuid[])
         AND f.deleted = false
       ORDER BY f.created_at ASC`,
      [topicIds],
    );
    return rows;
  }

  async findById(id) {
    const { rows } = await this.pool.query(
      `SELECT f.*
       FROM flashcards f
       JOIN topics t ON t.id = f.topic_id AND t.deleted = false
       JOIN subjects s ON s.id = f.subject_id AND s.deleted = false
       WHERE f.id = $1 AND f.deleted = false`,
      [id],
    );
    return rows[0] ? Flashcard.fromRow(rows[0]) : null;
  }

  async create({ question, topicId, subjectId, answerTypeId }, client) {
    const { rows } = await this.db(client).query(
      `INSERT INTO flashcards (question, topic_id, subject_id, answer_type_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [question, topicId, subjectId, answerTypeId],
    );
    return Flashcard.fromRow(rows[0]);
  }

  async update(id, { question }) {
    const { rows } = await this.pool.query(
      `UPDATE flashcards
       SET question = COALESCE($2, question)
       WHERE id = $1 AND deleted = false
       RETURNING *`,
      [id, question ?? null],
    );
    return rows[0] ? Flashcard.fromRow(rows[0]) : null;
  }

  async delete(id) {
    const { rows } = await this.pool.query(
      `UPDATE flashcards
       SET deleted = true
       WHERE id = $1 AND deleted = false
       RETURNING id`,
      [id],
    );
    if (!rows[0]) {
      return false;
    }
    await this.pool.query(
      `UPDATE answers
       SET deleted = true
       WHERE flashcard_id = $1 AND deleted = false`,
      [id],
    );
    return true;
  }
}

module.exports = PgFlashcardRepository;
