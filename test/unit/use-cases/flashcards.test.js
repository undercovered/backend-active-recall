const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const CreateFlashcard = require('../../../src/application/use-cases/CreateFlashcard');
const UpdateFlashcard = require('../../../src/application/use-cases/UpdateFlashcard');
const DeleteFlashcard = require('../../../src/application/use-cases/DeleteFlashcard');
const ConflictError = require('../../../src/domain/errors/ConflictError');
const { createMemoryRepos } = require('../../helpers/memoryRepos');
const { todayIso } = require('../../helpers/request');
const { TOPIC_REVIEW_DUE_MSG } = require('../../../src/application/topicReviewLock');

async function seedCard(repos, { dueToday = false } = {}) {
  const subject = await repos.subjectRepository.create({
    title: 'Java',
    description: null,
  });
  const topic = await repos.topicRepository.create({
    title: 'Loops',
    subjectId: subject.id,
  });
  const card = await repos.flashcardRepository.create({
    question: 'What is a loop?',
    topicId: topic.id,
    subjectId: subject.id,
    answerTypeId: 'at-o',
  });
  if (dueToday) {
    await repos.activeRecallRepository.createMany([
      {
        dateRecall: todayIso(),
        topicId: topic.id,
        subjectId: subject.id,
      },
    ]);
  }
  return { subject, topic, card };
}

describe('Flashcard mutations vs due reviews', () => {
  test('create / update / delete work when the topic is not due', async () => {
    const repos = createMemoryRepos();
    const { topic, card } = await seedCard(repos);
    const created = await new CreateFlashcard(repos).execute({
      topicId: topic.id,
      question: 'What is while?',
      answerTypeCode: 'open_answer',
      answers: [{ answerText: 'A loop', isCorrect: true }],
    });
    assert.equal(created.question, 'What is while?');

    const updated = await new UpdateFlashcard(repos).execute(card.id, {
      question: 'What is a for?',
    });
    assert.equal(updated.question, 'What is a for?');

    const removed = await new DeleteFlashcard(repos).execute(card.id);
    assert.deepEqual(removed, { id: card.id });
  });

  test('refuses create, update and delete while the topic has a due review', async () => {
    const repos = createMemoryRepos();
    const { topic, card } = await seedCard(repos, { dueToday: true });
    const create = new CreateFlashcard(repos);
    const update = new UpdateFlashcard(repos);
    const remove = new DeleteFlashcard(repos);

    await assert.rejects(
      () =>
        create.execute({
          topicId: topic.id,
          question: 'New',
          answerTypeCode: 'open_answer',
          answers: [{ answerText: 'A', isCorrect: true }],
        }),
      (err) =>
        err instanceof ConflictError &&
        err.code === 'TOPIC_REVIEW_DUE' &&
        err.message === TOPIC_REVIEW_DUE_MSG,
    );

    await assert.rejects(
      () => update.execute(card.id, { question: 'Changed' }),
      (err) => err.code === 'TOPIC_REVIEW_DUE',
    );

    await assert.rejects(
      () => remove.execute(card.id),
      (err) => err.code === 'TOPIC_REVIEW_DUE',
    );
  });
});
