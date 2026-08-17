const { resolveReviewDate } = require('../../domain/reviewDate');
const { averageRetention } = require('../../domain/retention');

class GetDashboardStats {
  constructor({ topicRepository, subjectRepository, activeRecallRepository }) {
    this.topicRepository = topicRepository;
    this.subjectRepository = subjectRepository;
    this.activeRecallRepository = activeRecallRepository;
  }

  async execute({ date } = {}) {
    const today = resolveReviewDate(date);
    const [due, subjects, topics, recalls] = await Promise.all([
      this.activeRecallRepository.countDueOn(today),
      this.subjectRepository.findAll(),
      this.topicRepository.findAll(),
      this.activeRecallRepository.findAllForAliveTopics(),
    ]);

    const aliveSubjectIds = new Set(subjects.map((s) => s.id));
    const aliveTopics = topics.filter((t) => aliveSubjectIds.has(t.subjectId));
    const recallsByTopic = new Map();
    for (const recall of recalls) {
      const list = recallsByTopic.get(recall.topicId) ?? [];
      list.push(recall);
      recallsByTopic.set(recall.topicId, list);
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
    };
  }
}

module.exports = GetDashboardStats;
