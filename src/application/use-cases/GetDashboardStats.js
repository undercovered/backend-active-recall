const { resolveReviewDate } = require('../../domain/reviewDate');
const {
  REVIEWS_FOR_FULL_RETENTION,
  averageRetention,
  toYmd,
} = require('../../domain/retention');

class GetDashboardStats {
  constructor({
    topicRepository,
    subjectRepository,
    activeRecallRepository,
    flashcardRepository,
  }) {
    this.topicRepository = topicRepository;
    this.subjectRepository = subjectRepository;
    this.activeRecallRepository = activeRecallRepository;
    this.flashcardRepository = flashcardRepository;
  }

  async execute({ date } = {}) {
    const today = resolveReviewDate(date);
    const [due, subjects, topics, recalls, flashcards] = await Promise.all([
      this.activeRecallRepository.countDueOn(today),
      this.subjectRepository.findAll(),
      this.topicRepository.findAll(),
      this.activeRecallRepository.findAllForAliveTopics(),
      this.flashcardRepository.findAll(),
    ]);

    const aliveSubjectIds = new Set(subjects.map((s) => s.id));
    const aliveTopics = topics.filter((t) => aliveSubjectIds.has(t.subjectId));
    const aliveTopicIds = new Set(aliveTopics.map((t) => t.id));

    const recallsByTopic = new Map();
    const completedByTopic = new Map();
    const dueTopicIds = new Set();

    for (const recall of recalls) {
      if (!aliveTopicIds.has(recall.topicId)) {
        continue;
      }
      const list = recallsByTopic.get(recall.topicId) ?? [];
      list.push(recall);
      recallsByTopic.set(recall.topicId, list);

      if (recall.completed === true) {
        completedByTopic.set(
          recall.topicId,
          (completedByTopic.get(recall.topicId) ?? 0) + 1,
        );
        continue;
      }

      const recallDay = toYmd(recall.dateRecall);
      if (recallDay && recallDay <= today) {
        dueTopicIds.add(recall.topicId);
      }
    }

    const subjectStats = new Map(
      subjects.map((subject) => [
        subject.id,
        { id: subject.id, dueToday: 0, inProgress: 0 },
      ]),
    );

    for (const card of flashcards) {
      if (!aliveSubjectIds.has(card.subjectId) || !aliveTopicIds.has(card.topicId)) {
        continue;
      }
      const bucket = subjectStats.get(card.subjectId);
      if (!bucket) {
        continue;
      }
      const completed = completedByTopic.get(card.topicId) ?? 0;
      if (completed < REVIEWS_FOR_FULL_RETENTION) {
        bucket.inProgress += 1;
      }
      if (dueTopicIds.has(card.topicId)) {
        bucket.dueToday += 1;
      }
    }

    const retentionRate = averageRetention(
      aliveTopics.map((topic) => ({
        learnedAt: topic.createdAt ?? today,
        recalls: recallsByTopic.get(topic.id) ?? [],
      })),
      today,
    );

    return {
      date: today,
      dueToday: due.count,
      topicCount: aliveTopics.length,
      retentionRate,
      subjects: [...subjectStats.values()],
    };
  }
}

module.exports = GetDashboardStats;
