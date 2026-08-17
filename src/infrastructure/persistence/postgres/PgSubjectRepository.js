const SubjectRepository = require('../../../domain/repositories/SubjectRepository');
const Subject = require('../../../domain/entities/Subject');

/**
 * PostgreSQL implementation of SubjectRepository.
 * Translates between domain entities and SQL rows using Subject.fromRow().
 * Deletes are soft (`deleted = true`); reads ignore those rows.
 */
class PgSubjectRepository extends SubjectRepository {
  /**
   * @param {import('pg').Pool} pool
   */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async findAll({ search } = {}) {
    const term = typeof search === 'string' ? search.trim() : '';
    if (term) {
      const { rows } = await this.pool.query(
        `SELECT * FROM subjects
         WHERE deleted = false AND title ILIKE $1
         ORDER BY created_at DESC`,
        [`%${term}%`],
      );
      return rows.map(Subject.fromRow);
    }

    const { rows } = await this.pool.query(
      `SELECT * FROM subjects
       WHERE deleted = false
       ORDER BY created_at DESC`,
    );
    return rows.map(Subject.fromRow);
  }

  async findById(id) {
    const { rows } = await this.pool.query(
      'SELECT * FROM subjects WHERE id = $1 AND deleted = false',
      [id],
    );
    return rows[0] ? Subject.fromRow(rows[0]) : null;
  }

  async create({ title, description = null }) {
    const { rows } = await this.pool.query(
      `INSERT INTO subjects (title, description)
       VALUES ($1, $2)
       RETURNING *`,
      [title, description],
    );
    return Subject.fromRow(rows[0]);
  }

  async update(id, { title, description }) {
    const { rows } = await this.pool.query(
      `UPDATE subjects
       SET title       = COALESCE($2, title),
           description = COALESCE($3, description)
       WHERE id = $1 AND deleted = false
       RETURNING *`,
      [id, title ?? null, description ?? null],
    );
    return rows[0] ? Subject.fromRow(rows[0]) : null;
  }

  async delete(id) {
    const { rows } = await this.pool.query(
      `UPDATE subjects
       SET deleted = true
       WHERE id = $1 AND deleted = false
       RETURNING id`,
      [id],
    );
    if (!rows[0]) {
      return false;
    }

    await this.pool.query(
      `UPDATE topics
       SET deleted = true
       WHERE subject_id = $1 AND deleted = false`,
      [id],
    );
    await this.pool.query(
      `UPDATE flashcards
       SET deleted = true
       WHERE subject_id = $1 AND deleted = false`,
      [id],
    );
    await this.pool.query(
      `UPDATE answers
       SET deleted = true
       WHERE subject_id = $1 AND deleted = false`,
      [id],
    );
    await this.pool.query(
      `UPDATE active_recall
       SET deleted = true
       WHERE subject_id = $1 AND deleted = false`,
      [id],
    );
    await this.pool.query(
      `UPDATE user_answers
       SET deleted = true
       WHERE subject_id = $1 AND deleted = false`,
      [id],
    );
    return true;
  }
}

module.exports = PgSubjectRepository;
