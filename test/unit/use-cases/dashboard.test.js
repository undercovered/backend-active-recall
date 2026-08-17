const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const GetDashboardStats = require('../../../src/application/use-cases/GetDashboardStats');
const { createMemoryRepos } = require('../../helpers/memoryRepos');

describe('GetDashboardStats', () => {
  test('empty catalog is zero due, zero topics and a dash-ready null rate', async () => {
    const repos = createMemoryRepos();
    const stats = await new GetDashboardStats(repos).execute({ date: '2026-08-17' });
    assert.deepEqual(stats, {
      date: '2026-08-17',
      dueToday: 0,
      topicCount: 0,
      retentionRate: null,
    });
  });

  test('counts due recalls, topics and averages retention', async () => {
    const repos = createMemoryRepos();
    const subject = await repos.subjectRepository.create({
      title: 'Java',
      description: null,
    });
    const fresh = await repos.topicRepository.create({
      title: 'Hoy',
      subjectId: subject.id,
      createdAt: '2026-08-17',
    });
    const older = await repos.topicRepository.create({
      title: 'Hace una semana',
      subjectId: subject.id,
      createdAt: '2026-08-10',
    });
    await repos.activeRecallRepository.createMany([
      { dateRecall: '2026-08-17', topicId: fresh.id },
      { dateRecall: '2026-08-18', topicId: older.id },
    ]);

    const stats = await new GetDashboardStats(repos).execute({ date: '2026-08-17' });
    assert.equal(stats.dueToday, 1);
    assert.equal(stats.topicCount, 2);
    const expected =
      Math.round(((100 + 100 * Math.exp(-1)) / 2) * 10) / 10;
    assert.equal(stats.retentionRate, expected);
  });
});
