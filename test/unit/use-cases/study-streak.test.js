const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const GetStudyStreak = require('../../../src/application/use-cases/GetStudyStreak');
const { createMemoryRepos } = require('../../helpers/memoryRepos');

describe('GetStudyStreak', () => {
  test('without a user starts today and ends on 31 Dec of that year', async () => {
    const repos = createMemoryRepos();
    const streak = await new GetStudyStreak(repos).execute({ date: '2026-08-18' });
    assert.deepEqual(streak, {
      startedAt: '2026-08-18',
      endedAt: '2026-12-31',
      today: '2026-08-18',
      days: {},
      attempts: [],
    });
  });

  test('counts distinct attempts per day from review history', async () => {
    const repos = createMemoryRepos();
    await repos.userAnswerRepository.create({
      attemptId: 'att-1',
      flashcardId: 'f1',
      openResponse: 'hola',
      subjectId: 's1',
      topicId: 't1',
      createdAt: '2026-08-18T15:00:00.000Z',
    });
    await repos.userAnswerRepository.create({
      attemptId: 'att-1',
      flashcardId: 'f2',
      openResponse: 'otra',
      subjectId: 's1',
      topicId: 't1',
      createdAt: '2026-08-18T15:05:00.000Z',
    });
    await repos.userAnswerRepository.create({
      attemptId: 'att-2',
      flashcardId: 'f1',
      openResponse: 'ayer',
      subjectId: 's1',
      topicId: 't1',
      createdAt: '2026-03-04T10:00:00.000Z',
    });

    const streak = await new GetStudyStreak(repos).execute({ date: '2026-08-18' });
    assert.equal(streak.days['2026-08-18'], 1);
    assert.equal(streak.days['2026-03-04'], 1);
    assert.equal(streak.attempts.length, 2);
  });

  test('falls back to completed reviews when there are no answers yet', async () => {
    const repos = createMemoryRepos();
    const subject = await repos.subjectRepository.create({
      title: 'Java',
      description: null,
    });
    const topic = await repos.topicRepository.create({
      title: 'Streams',
      subjectId: subject.id,
    });
    const [recall] = await repos.activeRecallRepository.createMany([
      {
        dateRecall: '2026-08-18',
        completed: true,
        topicId: topic.id,
        subjectId: subject.id,
      },
    ]);
    recall.updatedAt = '2026-08-18T22:47:00.000Z';

    const streak = await new GetStudyStreak(repos).execute({ date: '2026-08-18' });
    assert.equal(streak.days['2026-08-18'], 1);
    assert.deepEqual(streak.attempts, ['2026-08-18T22:47:00.000Z']);
  });

  test('same year as signup starts on the account day through 31 Dec', async () => {
    const repos = createMemoryRepos();
    const user = await repos.userRepository.create({
      firstName: 'Ana',
      lastName: 'Perez',
      email: 'ana@mail.com',
      username: 'ana_user1',
      passwordHash: 'hash',
      createdAt: '2026-03-22T12:00:00.000Z',
    });

    const streak = await new GetStudyStreak(repos).execute({
      date: '2026-08-18',
      userId: user.id,
    });
    assert.equal(streak.startedAt, '2026-03-22');
    assert.equal(streak.endedAt, '2026-12-31');
    assert.equal(streak.today, '2026-08-18');
  });

  test('later years span 1 Jan through 31 Dec', async () => {
    const repos = createMemoryRepos();
    const user = await repos.userRepository.create({
      firstName: 'Ana',
      lastName: 'Perez',
      email: 'ana2@mail.com',
      username: 'ana_user2',
      passwordHash: 'hash',
      createdAt: '2025-03-22T12:00:00.000Z',
    });

    const streak = await new GetStudyStreak(repos).execute({
      date: '2026-08-18',
      userId: user.id,
    });
    assert.equal(streak.startedAt, '2026-01-01');
    assert.equal(streak.endedAt, '2026-12-31');
  });
});
