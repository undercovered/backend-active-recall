const { resolveReviewDate } = require('../../domain/reviewDate');

/**
 * How many reviews are due on (or before) the given local date
 * and have not been finished yet (completed = false).
 */
class GetDueReviews {
  constructor({ activeRecallRepository }) {
    this.activeRecallRepository = activeRecallRepository;
  }

  async execute({ date } = {}) {
    const day = resolveReviewDate(date);
    const { count, topicCount } = await this.activeRecallRepository.countDueOn(day);
    return {
      date: day,
      hasPending: count > 0,
      count,
      topicCount,
    };
  }
}

module.exports = GetDueReviews;
