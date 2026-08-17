const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { buildRecallDates } = require('../../../src/domain/recallSchedule');
const { resolveReviewDate } = require('../../../src/domain/reviewDate');
const ValidationError = require('../../../src/domain/errors/ValidationError');
const SubjectRepository = require('../../../src/domain/repositories/SubjectRepository');
const TopicRepository = require('../../../src/domain/repositories/TopicRepository');
const FlashcardRepository = require('../../../src/domain/repositories/FlashcardRepository');
const AnswerRepository = require('../../../src/domain/repositories/AnswerRepository');
const AnswerTypeRepository = require('../../../src/domain/repositories/AnswerTypeRepository');
const ActiveRecallRepository = require('../../../src/domain/repositories/ActiveRecallRepository');
const UserAnswerRepository = require('../../../src/domain/repositories/UserAnswerRepository');
const UserRepository = require('../../../src/domain/repositories/UserRepository');

function localIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

describe('buildRecallDates', () => {
  test('returns 7 stacked dates from a known origin', () => {
    const from = new Date(2026, 0, 1); // 1 Jan 2026 local
    const dates = buildRecallDates(from);
    assert.equal(dates.length, 7);

    const iso = dates.map(localIso);
    assert.equal(iso[0], '2026-01-02'); // +1 day
    assert.equal(iso[1], '2026-01-05'); // +3
    assert.equal(iso[2], '2026-01-12'); // +7
    assert.equal(iso[3], '2026-01-27'); // +15
    assert.equal(iso[4], '2026-02-26'); // +30
  });

  test('each date is strictly after the previous', () => {
    const dates = buildRecallDates(new Date(2026, 5, 15));
    for (let i = 1; i < dates.length; i++) {
      assert.ok(dates[i].getTime() > dates[i - 1].getTime());
    }
  });
});

describe('resolveReviewDate', () => {
  test('accepts YYYY-MM-DD', () => {
    assert.equal(resolveReviewDate('2026-08-16'), '2026-08-16');
  });

  test('rejects malformed dates', () => {
    assert.throws(() => resolveReviewDate('16/08/2026'), ValidationError);
    assert.throws(() => resolveReviewDate('2026-8-16'), ValidationError);
  });

  test('defaults to today when omitted', () => {
    const today = resolveReviewDate();
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('repository ports throw until implemented', () => {
  test('SubjectRepository', async () => {
    const r = new SubjectRepository();
    await assert.rejects(() => r.findAll());
    await assert.rejects(() => r.findById('x'));
    await assert.rejects(() => r.create({}));
    await assert.rejects(() => r.update('x', {}));
    await assert.rejects(() => r.delete('x'));
  });

  test('TopicRepository', async () => {
    const r = new TopicRepository();
    await assert.rejects(() => r.findAll());
    await assert.rejects(() => r.findBySubjectId('s'));
    await assert.rejects(() => r.findById('x'));
    await assert.rejects(() => r.create({}));
    await assert.rejects(() => r.update('x', {}));
    await assert.rejects(() => r.delete('x'));
  });

  test('FlashcardRepository', async () => {
    const r = new FlashcardRepository();
    await assert.rejects(() => r.findAll());
    await assert.rejects(() => r.findByTopicId('t'));
    await assert.rejects(() => r.findById('x'));
    await assert.rejects(() => r.create({}));
    await assert.rejects(() => r.update('x', {}));
    await assert.rejects(() => r.delete('x'));
  });

  test('Answer / AnswerType / ActiveRecall / UserAnswer ports', async () => {
    const a = new AnswerRepository();
    await assert.rejects(() => a.findByFlashcardId('f'));
    await assert.rejects(() => a.create({}));

    const at = new AnswerTypeRepository();
    await assert.rejects(() => at.findAll());
    await assert.rejects(() => at.findById('x'));
    await assert.rejects(() => at.findByCode('c'));

    const ar = new ActiveRecallRepository();
    await assert.rejects(() => ar.findByTopicId('t'));
    await assert.rejects(() => ar.findAllForAliveTopics());
    await assert.rejects(() => ar.createMany([]));
    await assert.rejects(() => ar.countDueOn('2026-01-01'));
    await assert.rejects(() => ar.findDueOn('2026-01-01'));
    await assert.rejects(() => ar.findById('x'));
    await assert.rejects(() => ar.markCompleted('x'));

    const ua = new UserAnswerRepository();
    await assert.rejects(() => ua.findByAttemptId('a'));
    await assert.rejects(() => ua.create({}));
    await assert.rejects(() => ua.setCorrect('a', 'f', true));

    const users = new UserRepository();
    await assert.rejects(() => users.findByUsername('x'));
    await assert.rejects(() => users.findByEmail('x'));
    await assert.rejects(() => users.findById('x'));
    await assert.rejects(() => users.create({}));
  });
});
