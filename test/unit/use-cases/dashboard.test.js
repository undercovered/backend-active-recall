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
      subjects: [],
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
      { dateRecall: '2026-08-17', topicId: fresh.id, subjectId: subject.id },
      { dateRecall: '2026-08-18', topicId: older.id, subjectId: subject.id },
    ]);

    const stats = await new GetDashboardStats(repos).execute({ date: '2026-08-17' });
    assert.equal(stats.dueToday, 1);
    assert.equal(stats.topicCount, 2);
    const expected =
      Math.round(((100 + 100 * Math.exp(-1)) / 2) * 10) / 10;
    assert.equal(stats.retentionRate, expected);
    assert.deepEqual(stats.subjects, [
      { id: subject.id, dueToday: 0, inProgress: 0 },
    ]);
  });

  test('counts in-progress questions until the topic completes 7 reviews', async () => {
    const repos = createMemoryRepos();
    const subject = await repos.subjectRepository.create({
      title: 'Java',
      description: null,
    });
    const topic = await repos.topicRepository.create({
      title: 'Loops',
      subjectId: subject.id,
      createdAt: '2026-08-17',
    });
    await repos.flashcardRepository.create({
      question: 'What is a loop?',
      topicId: topic.id,
      subjectId: subject.id,
      answerTypeId: 'at-o',
    });
    await repos.flashcardRepository.create({
      question: 'What is a while?',
      topicId: topic.id,
      subjectId: subject.id,
      answerTypeId: 'at-o',
    });
    await repos.activeRecallRepository.createMany([
      {
        dateRecall: '2026-08-17',
        topicId: topic.id,
        subjectId: subject.id,
      },
    ]);

    const before = await new GetDashboardStats(repos).execute({
      date: '2026-08-17',
    });
    assert.deepEqual(before.subjects, [
      { id: subject.id, dueToday: 2, inProgress: 2 },
    ]);

    await repos.activeRecallRepository.createMany(
      Array.from({ length: 7 }, (_, i) => ({
        dateRecall: `2026-01-0${i + 1}`,
        completed: true,
        topicId: topic.id,
        subjectId: subject.id,
      })),
    );

    const after = await new GetDashboardStats(repos).execute({
      date: '2026-08-17',
    });
    assert.deepEqual(after.subjects, [
      { id: subject.id, dueToday: 2, inProgress: 0 },
    ]);
  });
});
