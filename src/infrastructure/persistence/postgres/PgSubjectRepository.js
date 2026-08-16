const SubjectRepository = require('../../../domain/repositories/SubjectRepository');
const Subject = require('../../../domain/entities/Subject');

/**
 * PostgreSQL implementation of SubjectRepository.
 * Translates between domain entities and SQL rows using Subject.fromRow().
 */
class PgSubjectRepository extends SubjectRepository {
  /**
   * @param {import('pg').Pool} pool
   */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async findAll() {
    const { rows } = await this.pool.query(
      'SELECT * FROM subjects ORDER BY created_at DESC',
    );
    return rows.map(Subject.fromRow);
  }

  async findById(id) {
    const { rows } = await this.pool.query(
      'SELECT * FROM subjects WHERE id = $1',
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
       WHERE id = $1
       RETURNING *`,
      [id, title ?? null, description ?? null],
    );
    return rows[0] ? Subject.fromRow(rows[0]) : null;
  }

  async delete(id) {
    const { rowCount } = await this.pool.query(
      'DELETE FROM subjects WHERE id = $1',
      [id],
    );
    return rowCount > 0;
  }
}

module.exports = PgSubjectRepository;
