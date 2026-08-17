const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const PgSubjectRepository = require('../../../src/infrastructure/persistence/postgres/PgSubjectRepository');
const PgTopicRepository = require('../../../src/infrastructure/persistence/postgres/PgTopicRepository');
const PgFlashcardRepository = require('../../../src/infrastructure/persistence/postgres/PgFlashcardRepository');
const PgAnswerRepository = require('../../../src/infrastructure/persistence/postgres/PgAnswerRepository');
const PgAnswerTypeRepository = require('../../../src/infrastructure/persistence/postgres/PgAnswerTypeRepository');
const PgActiveRecallRepository = require('../../../src/infrastructure/persistence/postgres/PgActiveRecallRepository');
const PgUserAnswerRepository = require('../../../src/infrastructure/persistence/postgres/PgUserAnswerRepository');
const PgUserRepository = require('../../../src/infrastructure/persistence/postgres/PgUserRepository');

function fakePool(handler) {
  const calls = [];
  const pool = {
    calls,
    async query(sql, params) {
      calls.push({ sql, params });
      return handler({ sql, params, calls }) ?? { rows: [], rowCount: 0 };
    },
  };
  return pool;
}

const subjectRow = {
  id: 's1',
  title: 'Java',
  description: 'OOP',
  created_at: 'a',
  updated_at: 'b',
};
const topicRow = {
  id: 't1',
  title: 'Loops',
  description: 'd',
  subject_id: 's1',
  created_at: 1,
  updated_at: 2,
};
const flashcardRow = {
  id: 'f1',
  question: 'What?',
  topic_id: 't1',
  answer_type_id: 'at1',
  created_at: 1,
  updated_at: 2,
};
const answerRow = {
  id: 'a1',
  answer_text: 'yes',
  is_correct: true,
  flashcard_id: 'f1',
  created_at: 1,
  updated_at: 2,
};

describe('PgSubjectRepository', () => {
  test('findAll without search, with search, findById, create, update, delete', async () => {
    const pool = fakePool(({ sql }) => {
      if (sql.includes('ILIKE')) return { rows: [subjectRow] };
      if (sql.startsWith('SELECT') && sql.includes('WHERE id')) return { rows: [subjectRow] };
      if (sql.startsWith('SELECT')) return { rows: [subjectRow] };
      if (sql.startsWith('INSERT') || sql.startsWith('UPDATE')) return { rows: [subjectRow] };
      if (sql.startsWith('DELETE')) return { rowCount: 1 };
      return { rows: [] };
    });
    const repo = new PgSubjectRepository(pool);

    const all = await repo.findAll();
    assert.equal(all[0].title, 'Java');
    assert.ok(pool.calls[0].sql.includes('ORDER BY created_at DESC'));

    const search = await repo.findAll({ search: ' ja ' });
    assert.deepEqual(pool.calls[1].params, ['%ja%']);
    assert.equal(search[0].id, 's1');

    assert.equal((await repo.findById('s1')).title, 'Java');
    assert.equal((await repo.create({ title: 'Java', description: 'OOP' })).id, 's1');
    assert.equal((await repo.update('s1', { title: 'J' })).id, 's1');
    assert.equal(await repo.delete('s1'), true);

    const empty = fakePool(() => ({ rows: [], rowCount: 0 }));
    assert.equal(await new PgSubjectRepository(empty).findById('x'), null);
    assert.equal(await new PgSubjectRepository(empty).delete('x'), false);
  });
});

describe('PgTopicRepository', () => {
  test('builds WHERE for subjectId and search; CRUD maps fromRow', async () => {
    const pool = fakePool(() => ({ rows: [topicRow], rowCount: 1 }));
    const repo = new PgTopicRepository(pool);

    const filtered = await repo.findAll({ subjectId: 's1', search: 'loop' });
    assert.equal(filtered[0].subjectId, 's1');
    assert.ok(pool.calls[0].sql.includes('subject_id'));
    assert.ok(pool.calls[0].sql.includes('ILIKE'));
    assert.deepEqual(pool.calls[0].params, ['s1', '%loop%']);

    const bySubject = await repo.findBySubjectId('s1');
    assert.equal(bySubject[0].title, 'Loops');

    assert.equal((await repo.findById('t1')).id, 't1');
    const created = await repo.create({
      title: 'Loops',
      description: 'd',
      subjectId: 's1',
    });
    assert.equal(created.subjectId, 's1');
    assert.equal((await repo.update('t1', { title: 'X' })).id, 't1');
    assert.equal(await repo.delete('t1'), true);
  });

  test('create uses the transactional client when provided', async () => {
    const client = {
      async query(sql, params) {
        this.sql = sql;
        this.params = params;
        return { rows: [topicRow] };
      },
    };
    const repo = new PgTopicRepository(fakePool(() => ({ rows: [] })));
    await repo.create({ title: 'T', subjectId: 's1' }, client);
    assert.ok(client.sql.includes('INSERT INTO topics'));
    assert.deepEqual(client.params, ['T', null, 's1']);
  });
});

describe('PgFlashcardRepository', () => {
  test('findByTopicIds short-circuits on empty list and otherwise joins types', async () => {
    const pool = fakePool(() => ({
      rows: [{ ...flashcardRow, answer_type_code: 'open_answer', answer_type_name: 'Abierta' }],
    }));
    const repo = new PgFlashcardRepository(pool);
    assert.deepEqual(await repo.findByTopicIds([]), []);
    const rows = await repo.findByTopicIds(['t1']);
    assert.equal(rows[0].answer_type_code, 'open_answer');
    assert.ok(pool.calls[0].sql.includes('ANY($1::uuid[])'));
  });

  test('findAll / findByTopicId / findById / create / update / delete', async () => {
    const pool = fakePool(() => ({ rows: [flashcardRow], rowCount: 1 }));
    const repo = new PgFlashcardRepository(pool);
    assert.equal((await repo.findAll())[0].question, 'What?');
    assert.equal((await repo.findByTopicId('t1'))[0].topicId, 't1');
    assert.equal((await repo.findById('f1')).answerTypeId, 'at1');
    assert.equal(
      (await repo.create({ question: 'What?', topicId: 't1', answerTypeId: 'at1' })).id,
      'f1',
    );
    assert.equal((await repo.update('f1', { question: 'Q' })).id, 'f1');
    assert.equal(await repo.delete('f1'), true);
  });
});

describe('PgAnswerRepository + PgAnswerTypeRepository', () => {
  test('answers map is_correct and skip empty id lists', async () => {
    const pool = fakePool(() => ({ rows: [answerRow] }));
    const repo = new PgAnswerRepository(pool);
    assert.equal((await repo.findByFlashcardId('f1'))[0].isCorrect, true);
    assert.deepEqual(await repo.findByFlashcardIds([]), []);
    assert.equal((await repo.findByFlashcardIds(['f1']))[0].answerText, 'yes');
    assert.equal(
      (await repo.create({ answerText: 'yes', isCorrect: true, flashcardId: 'f1' })).flashcardId,
      'f1',
    );
  });

  test('answer types findAll / findById / findByCode', async () => {
    const row = { id: '1', code: 'open_answer', name: 'Abierta' };
    const pool = fakePool(({ sql }) => {
      if (sql.includes('WHERE id')) return { rows: [row] };
      if (sql.includes('WHERE code')) return { rows: [row] };
      return { rows: [row] };
    });
    const repo = new PgAnswerTypeRepository(pool);
    assert.equal((await repo.findAll())[0].code, 'open_answer');
    assert.equal((await repo.findById('1')).name, 'Abierta');
    assert.equal((await repo.findByCode('open_answer')).id, '1');
    assert.equal(await new PgAnswerTypeRepository(fakePool(() => ({ rows: [] }))).findByCode('x'), null);
  });
});

describe('PgActiveRecallRepository', () => {
  test('countDueOn maps topic_count; findDueOn returns raw join rows', async () => {
    const pool = fakePool(({ sql }) => {
      if (sql.includes('COUNT(*)')) {
        return { rows: [{ count: 3, topic_count: 2 }] };
      }
      return {
        rows: [
          {
            id: 'r1',
            date_recall: '2026-08-16',
            correct_answer: null,
            topic_id: 't1',
            topic_title: 'Loops',
            subject_id: 's1',
            subject_title: 'Java',
          },
        ],
      };
    });
    const repo = new PgActiveRecallRepository(pool);
    assert.deepEqual(await repo.countDueOn('2026-08-16'), { count: 3, topicCount: 2 });
    const due = await repo.findDueOn('2026-08-16');
    assert.equal(due[0].subject_title, 'Java');
    assert.equal((await repo.findById('r1')).topic_id, 't1');
  });

  test('createMany inserts each item; markResult updates correct_answer', async () => {
    const pool = fakePool(() => ({
      rows: [
        {
          id: 'r1',
          date_recall: '2026-01-02',
          correct_answer: null,
          topic_id: 't1',
        },
      ],
    }));
    const repo = new PgActiveRecallRepository(pool);
    const created = await repo.createMany([
      { dateRecall: '2026-01-02', correctAnswer: null, topicId: 't1' },
    ]);
    assert.equal(created[0].topicId, 't1');
    const marked = await repo.markResult('r1', true);
    assert.equal(pool.calls.at(-1).params[1], true);
    assert.equal(marked.id, 'r1');

    const byTopic = await repo.findByTopicId('t1');
    assert.equal(byTopic[0].correctAnswer, null);
  });

  test('countDueOn defaults to zeros when the driver returns no row', async () => {
    const repo = new PgActiveRecallRepository(fakePool(() => ({ rows: [] })));
    assert.deepEqual(await repo.countDueOn('2026-01-01'), { count: 0, topicCount: 0 });
  });
});

describe('PgUserAnswerRepository', () => {
  const uaRow = {
    id: 'u1',
    attempt_id: 'att',
    flashcard_id: 'f1',
    answer_id: 'a1',
    open_response: null,
    subject_id: 's1',
    topic_id: 't1',
    is_correct: true,
    created_at: 1,
  };

  test('find / create / setCorrect map snake_case', async () => {
    const pool = fakePool(() => ({ rows: [uaRow] }));
    const repo = new PgUserAnswerRepository(pool);
    assert.equal((await repo.findByAttemptId('att'))[0].attemptId, 'att');
    assert.deepEqual(await repo.findByAttemptIds([]), []);
    assert.equal((await repo.findByAttemptIds(['att']))[0].isCorrect, true);
    const created = await repo.create({
      attemptId: 'att',
      flashcardId: 'f1',
      answerId: 'a1',
      subjectId: 's1',
      topicId: 't1',
      isCorrect: true,
    });
    assert.equal(created.flashcardId, 'f1');
    const graded = await repo.setCorrect('att', 'f1', false);
    assert.equal(graded[0].id, 'u1');
  });
});

describe('PgUserRepository', () => {
  const userRow = {
    id: 'u1',
    first_name: 'Ana',
    last_name: 'Pérez',
    email: 'ana@mail.com',
    username: 'ana_1',
    phone_country_code: '+57',
    phone: '300',
    password_hash: 'scrypt$hash',
    enabled: true,
    deleted: false,
    created_at: 1,
    updated_at: 2,
  };

  test('findByUsername / email / id and create map fromRow', async () => {
    const pool = fakePool(() => ({ rows: [userRow] }));
    const repo = new PgUserRepository(pool);
    assert.equal((await repo.findByUsername('Ana_1')).email, 'ana@mail.com');
    assert.equal((await repo.findByEmail('ana@mail.com')).username, 'ana_1');
    assert.equal((await repo.findById('u1')).firstName, 'Ana');
    const created = await repo.create({
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@mail.com',
      username: 'ana_1',
      phoneCountryCode: '+57',
      phone: '300',
      passwordHash: 'scrypt$hash',
    });
    assert.equal(created.id, 'u1');
    assert.equal(await new PgUserRepository(fakePool(() => ({ rows: [] }))).findById('x'), null);
  });
});
