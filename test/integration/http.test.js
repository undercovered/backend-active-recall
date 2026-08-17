const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createMemoryApp } = require('../helpers/createMemoryApp');
const { request, todayIso } = require('../helpers/request');

describe('HTTP integration — envelope and unknown routes', () => {
  let app;

  beforeEach(() => {
    ({ app } = createMemoryApp());
  });

  test('GET /api/health returns the standard envelope', async () => {
    const res = await request(app, { path: '/api/health' });
    assert.equal(res.status, 200);
    assert.equal(res.body.msg, '');
    assert.equal(res.body.data.status, 'ok');
    assert.equal(res.body.data.service, 'active-recall-backend');
  });

  test('unknown route is 404 with { data: null, msg }', async () => {
    const res = await request(app, { path: '/api/does-not-exist' });
    assert.equal(res.status, 404);
    assert.equal(res.body.data, null);
    assert.equal(res.body.msg, 'Ruta no encontrada.');
  });
});

describe('HTTP integration — subjects', () => {
  let app;

  beforeEach(() => {
    ({ app } = createMemoryApp());
  });

  test('CRUD + search + 404 after delete', async () => {
    const created = await request(app, {
      method: 'POST',
      path: '/api/subjects',
      body: { title: '  Java  ', description: 'OOP' },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.title, 'Java');
    assert.match(created.body.msg, /creada/);
    const id = created.body.data.id;

    const listed = await request(app, { path: '/api/subjects' });
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data.length, 1);

    const filtered = await request(app, { path: '/api/subjects?search=jav' });
    assert.equal(filtered.body.data[0].id, id);

    const emptySearch = await request(app, { path: '/api/subjects?search=python' });
    assert.equal(emptySearch.body.data.length, 0);

    const one = await request(app, { path: `/api/subjects/${id}` });
    assert.equal(one.body.data.description, 'OOP');

    const updated = await request(app, {
      method: 'PUT',
      path: `/api/subjects/${id}`,
      body: { title: 'Java SE', description: 'updated' },
    });
    assert.equal(updated.body.data.title, 'Java SE');
    assert.match(updated.body.msg, /actualizada/);

    const removed = await request(app, { method: 'DELETE', path: `/api/subjects/${id}` });
    assert.deepEqual(removed.body.data, { id });

    const missing = await request(app, { path: `/api/subjects/${id}` });
    assert.equal(missing.status, 404);
    assert.equal(missing.body.data, null);
    assert.match(missing.body.msg, /no encontrada/i);
  });

  test('POST without title is 400 envelope', async () => {
    const res = await request(app, {
      method: 'POST',
      path: '/api/subjects',
      body: { title: '   ' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.data, null);
    assert.ok(res.body.msg);
  });
});

describe('HTTP integration — topics and answer types', () => {
  let app;
  let repos;

  beforeEach(() => {
    ({ app, repos } = createMemoryApp());
  });

  async function seedSubject() {
    const res = await request(app, {
      method: 'POST',
      path: '/api/subjects',
      body: { title: 'Java' },
    });
    return res.body.data.id;
  }

  test('GET /api/answer-types lists the catalog', async () => {
    const res = await request(app, { path: '/api/answer-types' });
    assert.equal(res.status, 200);
    const codes = res.body.data.map((t) => t.code).sort();
    assert.deepEqual(codes, ['multiple_choice', 'open_answer', 'single_choice']);
  });

  test('create topic with questions, list, get, update, delete', async () => {
    const subjectId = await seedSubject();
    const created = await request(app, {
      method: 'POST',
      path: '/api/topics',
      body: {
        title: 'Loops',
        description: 'iteration',
        subjectId,
        questions: [
          {
            question: 'What is a for?',
            answerTypeCode: 'single_choice',
            answers: [
              { answerText: 'loop', isCorrect: true },
              { answerText: 'class', isCorrect: false },
            ],
          },
          {
            question: 'Explain iteration',
            answerTypeCode: 'open_answer',
            answers: [{ answerText: 'repeating a block' }],
          },
        ],
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.flashcards.length, 2);
    assert.equal(created.body.data.recalls.length, 7);
    assert.ok(created.body.data.recalls.every((r) => r.correctAnswer === null));
    const topicId = created.body.data.id;

    const listed = await request(app, {
      path: `/api/topics?subjectId=${subjectId}&search=loop`,
    });
    assert.equal(listed.body.data.length, 1);

    const other = await request(app, { path: '/api/topics?subjectId=nope' });
    assert.equal(other.body.data.length, 0);

    const one = await request(app, { path: `/api/topics/${topicId}` });
    assert.equal(one.body.data.flashcards[0].answers.length, 2);
    assert.equal(one.body.data.flashcard.question, 'What is a for?');

    const updated = await request(app, {
      method: 'PUT',
      path: `/api/topics/${topicId}`,
      body: { title: 'For loops' },
    });
    assert.equal(updated.body.data.title, 'For loops');

    const removed = await request(app, {
      method: 'DELETE',
      path: `/api/topics/${topicId}`,
    });
    assert.deepEqual(removed.body.data, { id: topicId });

    const missing = await request(app, { path: `/api/topics/${topicId}` });
    assert.equal(missing.status, 404);
  });

  test('create topic with unknown subject is 404', async () => {
    const res = await request(app, {
      method: 'POST',
      path: '/api/topics',
      body: {
        title: 'X',
        subjectId: 'missing',
        questions: [
          {
            question: 'Q',
            answerTypeCode: 'open_answer',
            answers: [{ answerText: 'A' }],
          },
        ],
      },
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.data, null);
  });

  test('legacy single-question payload still creates a topic', async () => {
    const subjectId = await seedSubject();
    const res = await request(app, {
      method: 'POST',
      path: '/api/topics',
      body: {
        title: 'If',
        subjectId,
        question: 'What is if?',
        answerTypeCode: 'open_answer',
        answers: [{ answerText: 'conditional' }],
      },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.flashcards.length, 1);
    assert.equal(repos.recalls.length, 7);
  });
});

describe('HTTP integration — reviews', () => {
  let app;
  let repos;

  beforeEach(() => {
    ({ app, repos } = createMemoryApp());
  });

  async function seedDueTopic() {
    const subject = await request(app, {
      method: 'POST',
      path: '/api/subjects',
      body: { title: 'Java' },
    });
    const topic = await request(app, {
      method: 'POST',
      path: '/api/topics',
      body: {
        title: 'Loops',
        subjectId: subject.body.data.id,
        questions: [
          {
            question: '2+2?',
            answerTypeCode: 'single_choice',
            answers: [
              { answerText: '4', isCorrect: true },
              { answerText: '5', isCorrect: false },
            ],
          },
          {
            question: 'Explain',
            answerTypeCode: 'open_answer',
            answers: [{ answerText: 'four' }],
          },
        ],
      },
    });
    repos.activeRecallRepository.makeDueToday(topic.body.data.id, todayIso());
    return {
      topicId: topic.body.data.id,
      cards: topic.body.data.flashcards,
    };
  }

  test('due-today rejects malformed dates without hitting persistence', async () => {
    const res = await request(app, { path: '/api/reviews/due-today?date=16/08/2026' });
    assert.equal(res.status, 400);
    assert.equal(res.body.data, null);
    assert.match(res.body.msg, /YYYY-MM-DD/);
  });

  test('empty day: due-today count 0 and session has no subjects', async () => {
    const due = await request(app, { path: `/api/reviews/due-today?date=${todayIso()}` });
    assert.equal(due.status, 200);
    assert.equal(due.body.data.hasPending, false);
    assert.equal(due.body.data.count, 0);

    const session = await request(app, { path: `/api/reviews/session?date=${todayIso()}` });
    assert.equal(session.body.data.hasPending, false);
    assert.deepEqual(session.body.data.subjects, []);
  });

  test('session hides isCorrect, grades choice, locks re-answer, grades open', async () => {
    const { cards } = await seedDueTopic();
    const choice = cards.find((c) => c.answerType.code === 'single_choice');
    const open = cards.find((c) => c.answerType.code === 'open_answer');
    const correctId = choice.answers.find((a) => a.isCorrect).id;
    const wrongId = choice.answers.find((a) => !a.isCorrect).id;

    const due = await request(app, { path: `/api/reviews/due-today?date=${todayIso()}` });
    assert.equal(due.body.data.hasPending, true);
    assert.ok(due.body.data.count >= 1);

    const session = await request(app, { path: `/api/reviews/session?date=${todayIso()}` });
    assert.equal(session.body.data.hasPending, true);
    const topic = session.body.data.subjects[0].topics[0];
    assert.equal(topic.title, 'Loops');
    const pendingChoice = topic.flashcards.find((f) => f.id === choice.id);
    assert.equal(pendingChoice.options[0].isCorrect, undefined);
    assert.equal(pendingChoice.state, 'pending');
    const recallId = topic.recallId;

    const wrong = await request(app, {
      method: 'POST',
      path: '/api/reviews/answer',
      body: { recallId, flashcardId: choice.id, answerIds: [wrongId] },
    });
    assert.equal(wrong.status, 200);
    assert.equal(wrong.body.data.isCorrect, false);
    assert.match(wrong.body.msg, /incorrecta/i);

    const locked = await request(app, {
      method: 'POST',
      path: '/api/reviews/answer',
      body: { recallId, flashcardId: choice.id, answerIds: [correctId] },
    });
    assert.equal(locked.status, 400);

    const openSubmit = await request(app, {
      method: 'POST',
      path: '/api/reviews/answer',
      body: { recallId, flashcardId: open.id, openResponse: 'cuatro' },
    });
    assert.equal(openSubmit.body.data.status, 'awaiting_grade');
    assert.equal(openSubmit.body.data.expectedText, 'four');
    assert.match(openSubmit.body.msg, /Compara/);

    const grade = await request(app, {
      method: 'POST',
      path: '/api/reviews/grade',
      body: { recallId, flashcardId: open.id, isCorrect: true },
    });
    assert.equal(grade.body.data.status, 'graded');
    assert.match(grade.body.msg, /correcta/);

    const regrade = await request(app, {
      method: 'POST',
      path: '/api/reviews/grade',
      body: { recallId, flashcardId: open.id, isCorrect: false },
    });
    assert.equal(regrade.status, 400);

    const after = await request(app, { path: `/api/reviews/session?date=${todayIso()}` });
    assert.equal(after.body.data.hasPending, false);
    assert.deepEqual(after.body.data.subjects, []);
  });

  test('POST /api/reviews/grade without boolean is 400', async () => {
    const res = await request(app, {
      method: 'POST',
      path: '/api/reviews/grade',
      body: { recallId: 'x', flashcardId: 'y' },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.data, null);
  });

  test('answering a missing recall is 404', async () => {
    const res = await request(app, {
      method: 'POST',
      path: '/api/reviews/answer',
      body: { recallId: 'missing', flashcardId: 'fc', answerIds: ['a'] },
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.data, null);
  });
});
