const ActiveRecallRepository = require('../../../domain/repositories/ActiveRecallRepository');
const ActiveRecall = require('../../../domain/entities/ActiveRecall');

class PgActiveRecallRepository extends ActiveRecallRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  db(client) {
    return client ?? this.pool;
  }

  async findByTopicId(topicId) {
    const { rows } = await this.pool.query(
      'SELECT * FROM active_recall WHERE topic_id = $1 AND deleted = false ORDER BY date_recall ASC',
      [topicId],
    );
    return rows.map(ActiveRecall.fromRow);
  }

  async findAllForAliveTopics() {
    const { rows } = await this.pool.query(
      `SELECT ar.*
       FROM active_recall ar
       JOIN topics t ON t.id = ar.topic_id AND t.deleted = false
       JOIN subjects s ON s.id = t.subject_id AND s.deleted = false
       WHERE ar.deleted = false
       ORDER BY ar.topic_id, ar.date_recall ASC`,
    );
    return rows.map(ActiveRecall.fromRow);
  }

  async createMany(items, client) {
    const created = [];
    for (const item of items) {
      const { rows } = await this.db(client).query(
        `INSERT INTO active_recall (date_recall, correct_answer, topic_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [item.dateRecall, item.correctAnswer ?? null, item.topicId],
      );
      created.push(ActiveRecall.fromRow(rows[0]));
    }
    return created;
  }

  async countDueOn(date) {
    const { rows } = await this.pool.query(
      `SELECT
         COUNT(*)::int AS count,
         COUNT(DISTINCT ar.topic_id)::int AS topic_count
       FROM active_recall ar
       JOIN topics t ON t.id = ar.topic_id AND t.deleted = false
       JOIN subjects s ON s.id = t.subject_id AND s.deleted = false
       WHERE ar.deleted = false
         AND ar.correct_answer IS NULL
         AND ar.date_recall::date <= $1::date`,
      [date],
    );
    return {
      count: rows[0]?.count ?? 0,
      topicCount: rows[0]?.topic_count ?? 0,
    };
  }

  /**
   * Earliest ungraded recall per topic that is due on or before `date`.
   */
  async findDueOn(date) {
    const { rows } = await this.pool.query(
      `SELECT DISTINCT ON (ar.topic_id)
         ar.id,
         ar.date_recall,
         ar.correct_answer,
         ar.topic_id,
         t.title AS topic_title,
         t.subject_id,
         s.title AS subject_title
       FROM active_recall ar
       JOIN topics t ON t.id = ar.topic_id AND t.deleted = false
       JOIN subjects s ON s.id = t.subject_id AND s.deleted = false
       WHERE ar.deleted = false
         AND ar.correct_answer IS NULL
         AND ar.date_recall::date <= $1::date
       ORDER BY ar.topic_id, ar.date_recall ASC`,
      [date],
    );
    return rows;
  }

  async findById(id) {
    const { rows } = await this.pool.query(
      `SELECT
         ar.id,
         ar.date_recall,
         ar.correct_answer,
         ar.topic_id,
         t.title AS topic_title,
         t.subject_id,
         s.title AS subject_title
       FROM active_recall ar
       JOIN topics t ON t.id = ar.topic_id AND t.deleted = false
       JOIN subjects s ON s.id = t.subject_id AND s.deleted = false
       WHERE ar.id = $1 AND ar.deleted = false`,
      [id],
    );
    return rows[0] ?? null;
  }

  async markResult(id, correctAnswer, client) {
    const db = client ?? this.pool;
    const { rows } = await db.query(
      `UPDATE active_recall
       SET correct_answer = $2
       WHERE id = $1 AND deleted = false
       RETURNING *`,
      [id, correctAnswer],
    );
    return rows[0] ?? null;
  }
}

module.exports = PgActiveRecallRepository;
