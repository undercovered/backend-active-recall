const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createMemoryApp } = require('../helpers/createMemoryApp');
const { request } = require('../helpers/request');

describe('HTTP integration — dashboard', () => {
  let app;
  let repos;

  beforeEach(() => {
    ({ app, repos } = createMemoryApp());
  });

  test('GET /api/dashboard/stats returns zeros and null retention when empty', async () => {
    const res = await request(app, { path: '/api/dashboard/stats?date=2026-08-17' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, {
      date: '2026-08-17',
      dueToday: 0,
      topicCount: 0,
      retentionRate: null,
      subjects: [],
    });
  });

  test('GET /api/dashboard/stats rejects a malformed date', async () => {
    const res = await request(app, { path: '/api/dashboard/stats?date=17/08/2026' });
    assert.equal(res.status, 400);
  });

  test('GET /api/dashboard/stats reflects created topics', async () => {
    const subject = await repos.subjectRepository.create({
      title: 'Java',
      description: null,
    });
    await repos.topicRepository.create({
      title: 'Streams',
      subjectId: subject.id,
      createdAt: '2026-08-17',
    });
    const res = await request(app, { path: '/api/dashboard/stats?date=2026-08-17' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.topicCount, 1);
    assert.equal(res.body.data.dueToday, 0);
    assert.equal(res.body.data.retentionRate, 100);
    assert.deepEqual(res.body.data.subjects, [
      { id: subject.id, dueToday: 0, inProgress: 0 },
    ]);
  });

  test('GET /api/dashboard/stats counts in-progress questions per subject', async () => {
    const subject = await repos.subjectRepository.create({
      title: 'Java',
      description: null,
    });
    const topic = await repos.topicRepository.create({
      title: 'Streams',
      subjectId: subject.id,
      createdAt: '2026-08-17',
    });
    await repos.flashcardRepository.create({
      question: 'What is a stream?',
      topicId: topic.id,
      subjectId: subject.id,
      answerTypeId: 'at-o',
    });
    const res = await request(app, { path: '/api/dashboard/stats?date=2026-08-17' });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.subjects, [
      { id: subject.id, dueToday: 0, inProgress: 1 },
    ]);
  });
});
