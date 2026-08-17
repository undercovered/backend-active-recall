const { resolveReviewDate } = require('../../domain/reviewDate');

/**
 * Full review session for a local day, grouped by subject → topic → flashcards.
 */
class GetReviewSession {
  constructor({
    activeRecallRepository,
    flashcardRepository,
    answerRepository,
    userAnswerRepository,
  }) {
    this.activeRecallRepository = activeRecallRepository;
    this.flashcardRepository = flashcardRepository;
    this.answerRepository = answerRepository;
    this.userAnswerRepository = userAnswerRepository;
  }

  async execute({ date } = {}) {
    const day = resolveReviewDate(date);
    const due = await this.activeRecallRepository.findDueOn(day);
    if (!due.length) {
      return { date: day, hasPending: false, subjects: [] };
    }

    const topicIds = due.map((row) => row.topic_id);
    const recallIds = due.map((row) => row.id);
    const flashcardRows = await this.flashcardRepository.findByTopicIds(topicIds);
    const flashcardIds = flashcardRows.map((row) => row.id);
    const answers = await this.answerRepository.findByFlashcardIds(flashcardIds);
    const attempts = await this.userAnswerRepository.findByAttemptIds(recallIds);

    const answersByCard = new Map();
    for (const answer of answers) {
      const list = answersByCard.get(answer.flashcardId) ?? [];
      list.push(answer);
      answersByCard.set(answer.flashcardId, list);
    }

    const attemptsByRecall = new Map();
    for (const ua of attempts) {
      const list = attemptsByRecall.get(ua.attemptId) ?? [];
      list.push(ua);
      attemptsByRecall.set(ua.attemptId, list);
    }

    const cardsByTopic = new Map();
    for (const row of flashcardRows) {
      const list = cardsByTopic.get(row.topic_id) ?? [];
      list.push(row);
      cardsByTopic.set(row.topic_id, list);
    }

    const subjectsMap = new Map();
    for (const recall of due) {
      if (!subjectsMap.has(recall.subject_id)) {
        subjectsMap.set(recall.subject_id, {
          id: recall.subject_id,
          title: recall.subject_title,
          topics: [],
        });
      }
      const subject = subjectsMap.get(recall.subject_id);
      const userAnswers = attemptsByRecall.get(recall.id) ?? [];
      const cards = cardsByTopic.get(recall.topic_id) ?? [];
      subject.topics.push({
        id: recall.topic_id,
        title: recall.topic_title,
        recallId: recall.id,
        dateRecall: recall.date_recall,
        flashcards: cards.map((card) =>
          this.#mapFlashcard(card, answersByCard.get(card.id) ?? [], userAnswers),
        ),
      });
    }

    return {
      date: day,
      hasPending: true,
      subjects: [...subjectsMap.values()],
    };
  }

  #mapFlashcard(card, answers, userAnswers) {
    const mine = userAnswers.filter((ua) => ua.flashcardId === card.id);
    const graded = mine.some((ua) => ua.isCorrect !== null);
    const awaitingGrade =
      !graded &&
      card.answer_type_code === 'open_answer' &&
      mine.some((ua) => ua.openResponse);

    let state = 'pending';
    if (graded) state = 'graded';
    else if (awaitingGrade) state = 'awaiting_grade';

    const payload = {
      id: card.id,
      question: card.question,
      answerTypeCode: card.answer_type_code,
      options: answers.map((a) => ({
        id: a.id,
        answerText: a.answerText,
      })),
      state,
      isCorrect: graded ? Boolean(mine[0]?.isCorrect) : null,
      selectedAnswerIds: mine.map((ua) => ua.answerId).filter(Boolean),
      openResponse: mine.find((ua) => ua.openResponse)?.openResponse ?? null,
      expectedText: null,
    };

    if (state !== 'pending' && card.answer_type_code === 'open_answer') {
      const expected = answers.find((a) => a.isCorrect) ?? answers[0];
      payload.expectedText = expected?.answerText ?? null;
    }

    return payload;
  }
}

module.exports = GetReviewSession;
