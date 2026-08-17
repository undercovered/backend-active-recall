const { asDeleted } = require('../flags');

/**
 * AnswerType entity (domain layer).
 * Mirrors the `answer_types` table (tipo de respuesta).
 */
class AnswerType {
  /**
   * @param {object} params
   * @param {string} [params.id]
   * @param {string} params.code
   * @param {string} params.name
   */
  constructor({ id, code, name, deleted = false }) {
    this.id = id;
    this.code = code;
    this.name = name;
    this.deleted = asDeleted(deleted);
  }

  static fromRow(row) {
    return new AnswerType({
      id: row.id,
      code: row.code,
      name: row.name,
      deleted: row.deleted,
    });
  }

  toJSON() {
    return { id: this.id, code: this.code, name: this.name, deleted: this.deleted };
  }
}

module.exports = AnswerType;
