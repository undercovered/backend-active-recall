const TopicRepository = require('../../../domain/repositories/TopicRepository');
const Topic = require('../../../domain/entities/Topic');

/**
 * PostgreSQL implementation of TopicRepository.
 * Deletes are soft (`deleted = true`); reads ignore those rows.
 */
class PgTopicRepository extends TopicRepository {
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

  async findAll({ search, subjectId } = {}) {
    const term = typeof search === 'string' ? search.trim() : '';
    const clauses = ['deleted = false'];
    const values = [];

    if (subjectId) {
      values.push(subjectId);
      clauses.push(`subject_id = $${values.length}`);
    }
    if (term) {
      values.push(`%${term}%`);
      clauses.push(`title ILIKE $${values.length}`);
    }

    const { rows } = await this.pool.query(
      `SELECT * FROM topics WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC`,
      values,
    );
    return rows.map(Topic.fromRow);
  }

  async findBySubjectId(subjectId) {
    return this.findAll({ subjectId });
  }

  async findById(id) {
    const { rows } = await this.pool.query(
      'SELECT * FROM topics WHERE id = $1 AND deleted = false',
      [id],
    );
    return rows[0] ? Topic.fromRow(rows[0]) : null;
  }

  async create({ title, description = null, subjectId }, client) {
    const { rows } = await this.db(client).query(
      `INSERT INTO topics (title, description, subject_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [title, description, subjectId],
    );
    return Topic.fromRow(rows[0]);
  }

  async update(id, { title, description }) {
    const { rows } = await this.pool.query(
      `UPDATE topics
       SET title       = COALESCE($2, title),
           description = COALESCE($3, description)
       WHERE id = $1 AND deleted = false
       RETURNING *`,
      [id, title ?? null, description ?? null],
    );
    return rows[0] ? Topic.fromRow(rows[0]) : null;
  }

  async delete(id) {
    const { rows } = await this.pool.query(
      `UPDATE topics
       SET deleted = true
       WHERE id = $1 AND deleted = false
       RETURNING id`,
      [id],
    );
    if (!rows[0]) {
      return false;
    }

    await this.pool.query(
      `UPDATE flashcards
       SET deleted = true
       WHERE topic_id = $1 AND deleted = false`,
      [id],
    );
    await this.pool.query(
      `UPDATE answers
       SET deleted = true
       WHERE deleted = false
         AND flashcard_id IN (SELECT id FROM flashcards WHERE topic_id = $1)`,
      [id],
    );
    await this.pool.query(
      `UPDATE active_recall
       SET deleted = true
       WHERE topic_id = $1 AND deleted = false`,
      [id],
    );
    await this.pool.query(
      `UPDATE user_answers
       SET deleted = true
       WHERE topic_id = $1 AND deleted = false`,
      [id],
    );
    return true;
  }
}

module.exports = PgTopicRepository;
