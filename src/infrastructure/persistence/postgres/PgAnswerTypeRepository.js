const AnswerTypeRepository = require('../../../domain/repositories/AnswerTypeRepository');
const AnswerType = require('../../../domain/entities/AnswerType');

class PgAnswerTypeRepository extends AnswerTypeRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  async findAll() {
    const { rows } = await this.pool.query(
      'SELECT * FROM answer_types WHERE deleted = false ORDER BY name ASC',
    );
    return rows.map(AnswerType.fromRow);
  }

  async findById(id) {
    const { rows } = await this.pool.query(
      'SELECT * FROM answer_types WHERE id = $1 AND deleted = false',
      [id],
    );
    return rows[0] ? AnswerType.fromRow(rows[0]) : null;
  }

  async findByCode(code) {
    const { rows } = await this.pool.query(
      'SELECT * FROM answer_types WHERE code = $1 AND deleted = false',
      [code],
    );
    return rows[0] ? AnswerType.fromRow(rows[0]) : null;
  }
}

module.exports = PgAnswerTypeRepository;
