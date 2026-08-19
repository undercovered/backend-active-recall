const { resolveReviewDate } = require('../../domain/reviewDate');
const { toYmd } = require('../../domain/retention');

function yearOf(ymd) {
  return String(ymd ?? '').slice(0, 4);
}

function yearStart(ymd) {
  return `${yearOf(ymd)}-01-01`;
}

function yearEnd(ymd) {
  return `${yearOf(ymd)}-12-31`;
}

function toIso(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Study heatmap window:
 * - same year as account creation: from that day through 31 Dec
 * - later years: 1 Jan through 31 Dec of the current year
 *
 * `attempts` are ISO timestamps so the front can bucket by the learner's
 * local calendar day (UTC midnight would shift evening reviews).
 */
class GetStudyStreak {
  constructor({ userAnswerRepository, userRepository, activeRecallRepository }) {
    this.userAnswerRepository = userAnswerRepository;
    this.userRepository = userRepository;
    this.activeRecallRepository = activeRecallRepository;
  }

  async execute({ userId, date } = {}) {
    const today = resolveReviewDate(date);
    let created = today;

    if (userId && this.userRepository) {
      const user = await this.userRepository.findById(userId);
      const createdYmd = toYmd(user?.createdAt);
      if (createdYmd) {
        created = createdYmd;
      }
    }

    const startedAt = yearOf(created) === yearOf(today) ? created : yearStart(today);
    const endedAt = yearEnd(today);

    let raw = [];
    if (typeof this.userAnswerRepository.listAttemptStartedAt === 'function') {
      raw = await this.userAnswerRepository.listAttemptStartedAt();
    }

    let attempts = raw.map(toIso).filter(Boolean);

    if (
      attempts.length === 0 &&
      this.activeRecallRepository &&
      typeof this.activeRecallRepository.findAllForAliveTopics === 'function'
    ) {
      const recalls = await this.activeRecallRepository.findAllForAliveTopics();
      attempts = recalls
        .filter((recall) => recall.completed === true)
        .map((recall) => toIso(recall.updatedAt || recall.createdAt))
        .filter(Boolean);
    }

    const days = {};
    for (const iso of attempts) {
      const parsed = new Date(iso);
      const day = Number.isNaN(parsed.getTime()) ? toYmd(iso) : toYmd(parsed);
      if (!day) continue;
      days[day] = (days[day] ?? 0) + 1;
    }

    return {
      startedAt,
      endedAt,
      today,
      days,
      attempts,
    };
  }
}

module.exports = GetStudyStreak;
module.exports.yearStart = yearStart;
module.exports.yearEnd = yearEnd;
