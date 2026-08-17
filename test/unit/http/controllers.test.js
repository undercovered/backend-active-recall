const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const SubjectController = require('../../../src/interfaces/http/controllers/SubjectController');
const TopicController = require('../../../src/interfaces/http/controllers/TopicController');
const ReviewController = require('../../../src/interfaces/http/controllers/ReviewController');
const AnswerTypeController = require('../../../src/interfaces/http/controllers/AnswerTypeController');
const { mockReq, invoke } = require('../../helpers/http');
const { errorHandler, notFoundHandler } = require('../../../src/interfaces/http/middlewares/errorHandler');
const asyncHandler = require('../../../src/interfaces/http/middlewares/asyncHandler');
const { sendSuccess } = require('../../../src/interfaces/http/httpResponse');
const ValidationError = require('../../../src/domain/errors/ValidationError');
const NotFoundError = require('../../../src/domain/errors/NotFoundError');

function uc(result) {
  return { execute: async () => result };
}

describe('httpResponse + middlewares', () => {
  test('sendSuccess defaults to 200 and empty msg', async () => {
    const { mockRes } = require('../../helpers/http');
    const res = mockRes();
    sendSuccess(res, { data: { ok: true } });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { data: { ok: true }, msg: '' });
  });

  test('notFoundHandler uses the standard envelope', () => {
    const { mockRes } = require('../../helpers/http');
    const res = mockRes();
    notFoundHandler({}, res);
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, {
      data: null,
      msg: 'Ruta no encontrada.',
      code: 'ROUTE_NOT_FOUND',
    });
  });

  test('errorHandler maps AppError status and hides 500 details', () => {
    const { mockRes } = require('../../helpers/http');
    const res = mockRes();
    errorHandler(new ValidationError('bad title'), {}, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.msg, 'bad title');
    assert.equal(res.body.code, 'VALIDATION_ERROR');

    const res2 = mockRes();
    const errorLog = console.error;
    console.error = () => {};
    errorHandler(new Error('secret'), {}, res2, () => {});
    console.error = errorLog;
    assert.equal(res2.statusCode, 500);
    assert.equal(res2.body.msg, 'Error interno del servidor.');
    assert.equal(res2.body.data, null);
    assert.equal(res2.body.code, 'INTERNAL_ERROR');
  });

  test('asyncHandler forwards rejections to next', async () => {
    const handler = asyncHandler(async () => {
      throw new NotFoundError('nope');
    });
    await assert.rejects(() =>
      new Promise((resolve, reject) => {
        handler({}, {}, (err) => (err ? reject(err) : resolve()));
      }),
    );
  });
});

describe('SubjectController endpoints', () => {
  const sample = { id: '1', title: 'Java' };
  const controller = new SubjectController({
    getAllSubjects: { execute: async ({ search }) => (search ? [sample] : [sample, { id: '2' }]) },
    getSubjectById: uc(sample),
    createSubject: uc(sample),
    updateSubject: uc({ ...sample, title: 'J' }),
    deleteSubject: uc({ id: '1' }),
  });

  test('GET all / by id / create / update / delete', async () => {
    const list = await invoke(controller.getAll, mockReq({ query: { search: 'ja' } }));
    assert.equal(list.statusCode, 200);
    assert.equal(list.body.data.length, 1);

    const one = await invoke(controller.getById, mockReq({ params: { id: '1' } }));
    assert.equal(one.body.data.title, 'Java');

    const created = await invoke(controller.create, mockReq({ body: { title: 'Java' } }));
    assert.equal(created.statusCode, 201);
    assert.match(created.body.msg, /creada/);

    const updated = await invoke(controller.update, mockReq({ params: { id: '1' }, body: { title: 'J' } }));
    assert.match(updated.body.msg, /actualizada/);

    const removed = await invoke(controller.remove, mockReq({ params: { id: '1' } }));
    assert.deepEqual(removed.body.data, { id: '1' });
  });
});

describe('TopicController endpoints', () => {
  const controller = new TopicController({
    getAllTopics: uc([{ id: 't1' }]),
    getTopicById: uc({ id: 't1', flashcards: [] }),
    createTopic: uc({ id: 't1' }),
    updateTopic: uc({ id: 't1', title: 'X' }),
    deleteTopic: uc({ id: 't1' }),
  });

  test('CRUD envelope and status codes', async () => {
    const list = await invoke(controller.getAll, mockReq({ query: { subjectId: 's' } }));
    assert.equal(list.body.data[0].id, 't1');

    const one = await invoke(controller.getById, mockReq({ params: { id: 't1' } }));
    assert.ok('flashcards' in one.body.data);

    const created = await invoke(
      controller.create,
      mockReq({ body: { title: 'T', subjectId: 's', questions: [] } }),
    );
    assert.equal(created.statusCode, 201);

    const updated = await invoke(controller.update, mockReq({ params: { id: 't1' }, body: { title: 'X' } }));
    assert.match(updated.body.msg, /actualizado/);

    const removed = await invoke(controller.remove, mockReq({ params: { id: 't1' } }));
    assert.equal(removed.body.data.id, 't1');
  });
});

describe('ReviewController endpoints', () => {
  const controller = new ReviewController({
    getDueReviews: uc({ hasPending: true, count: 2 }),
    getReviewSession: uc({ hasPending: true, subjects: [] }),
    submitReviewAnswer: uc({ status: 'graded', isCorrect: true }),
    gradeOpenAnswer: uc({ status: 'graded', isCorrect: false }),
  });

  test('due-today, session, answer and grade', async () => {
    const due = await invoke(controller.dueToday, mockReq({ query: { date: '2026-08-16' } }));
    assert.equal(due.body.data.count, 2);

    const session = await invoke(controller.session, mockReq({ query: {} }));
    assert.equal(session.body.data.hasPending, true);

    const ans = await invoke(
      controller.answer,
      mockReq({ body: { recallId: 'r', flashcardId: 'f', answerIds: ['a'] } }),
    );
    assert.match(ans.body.msg, /Correcto/);

    const grade = await invoke(
      controller.grade,
      mockReq({ body: { recallId: 'r', flashcardId: 'f', isCorrect: false } }),
    );
    assert.match(grade.body.msg, /incorrecta/);
  });
});

describe('AnswerTypeController', () => {
  test('GET all', async () => {
    const controller = new AnswerTypeController({
      getAllAnswerTypes: uc([{ code: 'open_answer' }]),
    });
    const res = await invoke(controller.getAll, mockReq());
    assert.equal(res.body.data[0].code, 'open_answer');
  });
});
