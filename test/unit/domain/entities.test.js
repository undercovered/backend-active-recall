const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const Subject = require('../../../src/domain/entities/Subject');
const Topic = require('../../../src/domain/entities/Topic');
const Flashcard = require('../../../src/domain/entities/Flashcard');
const Answer = require('../../../src/domain/entities/Answer');
const AnswerType = require('../../../src/domain/entities/AnswerType');
const ActiveRecall = require('../../../src/domain/entities/ActiveRecall');
const UserAnswer = require('../../../src/domain/entities/UserAnswer');
const ValidationError = require('../../../src/domain/errors/ValidationError');
const NotFoundError = require('../../../src/domain/errors/NotFoundError');
const AppError = require('../../../src/domain/errors/AppError');

describe('Subject entity', () => {
  test('trims title and accepts optional description', () => {
    const s = new Subject({ title: '  Java  ', description: 'OOP' });
    assert.equal(s.title, 'Java');
    assert.equal(s.description, 'OOP');
  });

  test('rejects blank title', () => {
    assert.throws(() => new Subject({ title: '   ' }), ValidationError);
    assert.throws(() => new Subject({}), ValidationError);
  });

  test('fromRow maps snake_case and toJSON is stable', () => {
    const s = Subject.fromRow({
      id: '1',
      title: 'Math',
      description: null,
      created_at: 'a',
      updated_at: 'b',
    });
    assert.deepEqual(s.toJSON(), {
      id: '1',
      title: 'Math',
      description: null,
      deleted: false,
      createdAt: 'a',
      updatedAt: 'b',
    });
  });
});

describe('Topic entity', () => {
  test('requires title and subjectId', () => {
    assert.throws(() => new Topic({ title: 'T' }), ValidationError);
    assert.throws(() => new Topic({ subjectId: 's' }), ValidationError);
    const t = new Topic({ title: '  Loops ', subjectId: 'sub-1' });
    assert.equal(t.title, 'Loops');
  });

  test('fromRow maps subject_id', () => {
    const t = Topic.fromRow({
      id: 't1',
      title: 'Loops',
      description: 'desc',
      subject_id: 's1',
      created_at: 1,
      updated_at: 2,
    });
    assert.equal(t.subjectId, 's1');
    assert.equal(t.toJSON().subjectId, 's1');
  });
});

describe('Flashcard entity', () => {
  test('requires question, topicId, subjectId and answerTypeId', () => {
    assert.throws(() => new Flashcard({ topicId: 't', subjectId: 's', answerTypeId: 'a' }), ValidationError);
    assert.throws(() => new Flashcard({ question: 'Q', subjectId: 's', answerTypeId: 'a' }), ValidationError);
    assert.throws(() => new Flashcard({ question: 'Q', topicId: 't', answerTypeId: 'a' }), ValidationError);
    assert.throws(() => new Flashcard({ question: 'Q', topicId: 't', subjectId: 's' }), ValidationError);
  });

  test('fromRow maps FKs', () => {
    const f = Flashcard.fromRow({
      id: 'f1',
      question: 'What?',
      topic_id: 't1',
      subject_id: 's1',
      answer_type_id: 'at1',
      created_at: 1,
      updated_at: 2,
    });
    assert.equal(f.topicId, 't1');
    assert.equal(f.subjectId, 's1');
    assert.equal(f.answerTypeId, 'at1');
    assert.equal(f.toJSON().question, 'What?');
  });
});

describe('Answer entity', () => {
  test('requires answerText and flashcardId', () => {
    assert.throws(() => new Answer({ flashcardId: 'f', topicId: 't', subjectId: 's' }), ValidationError);
    assert.throws(() => new Answer({ answerText: 'yes' }), ValidationError);
    assert.throws(
      () => new Answer({ answerText: 'yes', flashcardId: 'f' }),
      ValidationError,
    );
  });

  test('coerces isCorrect to boolean', () => {
    const a = Answer.fromRow({
      id: 'a1',
      answer_text: '  yes ',
      is_correct: true,
      flashcard_id: 'f1',
      topic_id: 't1',
      subject_id: 's1',
    });
    assert.equal(a.answerText, 'yes');
    assert.equal(a.isCorrect, true);
    assert.equal(a.toJSON().flashcardId, 'f1');
    assert.equal(a.toJSON().subjectId, 's1');
  });
});

describe('AnswerType entity', () => {
  test('fromRow and toJSON', () => {
    const t = AnswerType.fromRow({ id: '1', code: 'open_answer', name: 'Abierta' });
    assert.deepEqual(t.toJSON(), {
      id: '1',
      code: 'open_answer',
      name: 'Abierta',
      deleted: false,
    });
  });
});

describe('ActiveRecall entity', () => {
  test('requires dateRecall and topicId', () => {
    assert.throws(() => new ActiveRecall({ topicId: 't', subjectId: 's' }), ValidationError);
    assert.throws(() => new ActiveRecall({ dateRecall: new Date() }), ValidationError);
    assert.throws(
      () => new ActiveRecall({ dateRecall: new Date(), topicId: 't' }),
      ValidationError,
    );
  });

  test('fromRow maps completed and defaults missing values to false', () => {
    const r = ActiveRecall.fromRow({
      id: 'r1',
      date_recall: '2026-01-01',
      completed: false,
      topic_id: 't1',
      subject_id: 's1',
    });
    assert.equal(r.completed, false);
    assert.equal(r.toJSON().topicId, 't1');
    assert.equal(r.toJSON().subjectId, 's1');
    assert.equal(
      ActiveRecall.fromRow({
        id: 'r2',
        date_recall: '2026-01-01',
        topic_id: 't1',
        subject_id: 's1',
      }).completed,
      false,
    );
  });
});

describe('UserAnswer entity', () => {
  test('fromRow maps attempt and nullable is_correct', () => {
    const u = UserAnswer.fromRow({
      id: 'u1',
      attempt_id: 'att',
      flashcard_id: 'f',
      answer_id: 'a',
      open_response: null,
      subject_id: 's',
      topic_id: 't',
      is_correct: null,
      created_at: 1,
    });
    assert.equal(u.attemptId, 'att');
    assert.equal(u.isCorrect, null);
    assert.equal(u.toJSON().subjectId, 's');
  });
});

describe('Error hierarchy', () => {
  test('ValidationError is 400 operational AppError', () => {
    const err = new ValidationError('bad');
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
    assert.equal(err.isOperational, true);
    assert.equal(err.message, 'bad');
    assert.equal(err.code, 'VALIDATION_ERROR');
  });

  test('NotFoundError is 404', () => {
    const err = new NotFoundError('missing');
    assert.equal(err.statusCode, 404);
    assert.ok(err instanceof AppError);
  });

  test('AppError defaults to 500', () => {
    const err = new AppError('x');
    assert.equal(err.statusCode, 500);
  });

  test('AuthError carries a machine-readable code', () => {
    const AuthError = require('../../../src/domain/errors/AuthError');
    const err = new AuthError('nope', 'AUTH_INVALID_PASSWORD');
    assert.equal(err.statusCode, 401);
    assert.equal(err.code, 'AUTH_INVALID_PASSWORD');
    assert.ok(err instanceof AppError);
  });
});
