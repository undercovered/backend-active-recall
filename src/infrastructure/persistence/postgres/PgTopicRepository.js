const TopicRepository = require('../../../domain/repositories/TopicRepository');
const Topic = require('../../../domain/entities/Topic');

/**
 * PostgreSQL implementation of TopicRepository.
 */
class PgTopicRepository extends TopicRepository {
  /**
   * @param {import('pg').Pool} pool
   */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async findAll() {
    const { rows } = await this.pool.query(
      'SELECT * FROM topics ORDER BY created_at DESC',
    );
    return rows.map(Topic.fromRow);
  }

  async findBySubjectId(subjectId) {
    const { rows } = await this.pool.query(
      'SELECT * FROM topics WHERE subject_id = $1 ORDER BY created_at DESC',
      [subjectId],
    );
    return rows.map(Topic.fromRow);
  }

  async findById(id) {
    const { rows } = await this.pool.query(
      'SELECT * FROM topics WHERE id = $1',
      [id],
    );
    return rows[0] ? Topic.fromRow(rows[0]) : null;
  }

  async create({ title, description = null, subjectId }) {
    const { rows } = await this.pool.query(
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
       WHERE id = $1
       RETURNING *`,
      [id, title ?? null, description ?? null],
    );
    return rows[0] ? Topic.fromRow(rows[0]) : null;
  }

  async delete(id) {
    const { rowCount } = await this.pool.query(
      'DELETE FROM topics WHERE id = $1',
      [id],
    );
    return rowCount > 0;
  }
}

module.exports = PgTopicRepository;
