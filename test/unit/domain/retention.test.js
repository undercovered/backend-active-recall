const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  daysBetween,
  stabilityAfterSuccesses,
  topicRetention,
  averageRetention,
} = require('../../../src/domain/retention');

describe('retention', () => {
  test('daysBetween counts calendar days and never goes negative', () => {
    assert.equal(daysBetween('2026-01-01', '2026-01-08'), 7);
    assert.equal(daysBetween('2026-01-08', '2026-01-01'), 0);
    assert.equal(daysBetween(new Date(2026, 0, 1), '2026-01-01'), 0);
  });

  test('stability grows by 2.5 after each successful review', () => {
    assert.equal(stabilityAfterSuccesses(0), 7);
    assert.equal(stabilityAfterSuccesses(1), 17.5);
    assert.equal(Math.round(stabilityAfterSuccesses(2) * 10) / 10, 43.8);
  });

  test('a topic just learned today is at 100%', () => {
    assert.equal(
      topicRetention({ learnedAt: '2026-08-17', recalls: [], today: '2026-08-17' }),
      100,
    );
  });

  test('without reviews, retention decays from S=7', () => {
    const r = topicRetention({
      learnedAt: '2026-08-10',
      recalls: [],
      today: '2026-08-17',
    });
    assert.equal(Math.round(r * 10) / 10, Math.round(100 * Math.exp(-1) * 10) / 10);
  });

  test('seven successful reviews lock retention at 100%', () => {
    const recalls = Array.from({ length: 7 }, (_, i) => ({
      correctAnswer: true,
      dateRecall: `2026-0${i + 1}-01`,
    }));
    assert.equal(
      topicRetention({
        learnedAt: '2026-01-01',
        recalls,
        today: '2026-08-17',
      }),
      100,
    );
  });

  test('average is null without topics and the mean otherwise', () => {
    assert.equal(averageRetention([], '2026-08-17'), null);
    const avg = averageRetention(
      [
        { learnedAt: '2026-08-17', recalls: [] },
        { learnedAt: '2026-08-10', recalls: [] },
      ],
      '2026-08-17',
    );
    const expected =
      Math.round(((100 + 100 * Math.exp(-1)) / 2) * 10) / 10;
    assert.equal(avg, expected);
  });
});
