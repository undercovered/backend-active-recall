const { resolveReviewDate } = require('../../domain/reviewDate');
const { toYmd } = require('../../domain/retention');

function monthStart(ymd) {
  const match = String(ymd ?? '').match(/^(\d{4})-(\d{2})/);
  if (!match) return ymd;
  return `${match[1]}-${match[2]}-01`;
}

/**
 * Study heatmap: one green cell per day the learner actually reviewed
 * (distinct attempt_id in user_answers). The grid starts on the first
 * day of the month the account was created.
 */
class GetStudyStreak {
  constructor({ userAnswerRepository, userRepository }) {
    this.userAnswerRepository = userAnswerRepository;
    this.userRepository = userRepository;
  }

  async execute({ userId, date } = {}) {
    const today = resolveReviewDate(date);
    let origin = today;

    if (userId && this.userRepository) {
      const user = await this.userRepository.findById(userId);
      const created = toYmd(user?.createdAt);
      if (created) {
        origin = created;
      }
    }

    const days = await this.userAnswerRepository.countAttemptsByDay();
    const startedAt = monthStart(origin);

    return {
      startedAt,
      today,
      days,
    };
  }
}

module.exports = GetStudyStreak;
module.exports.monthStart = monthStart;
