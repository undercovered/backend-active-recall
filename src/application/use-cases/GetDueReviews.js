const { resolveReviewDate } = require('../../domain/reviewDate');
const { dueTopicIds } = require('../topicReviewLock');

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
    const [{ count, topicCount }, topicIds] = await Promise.all([
      this.activeRecallRepository.countDueOn(day),
      dueTopicIds(this.activeRecallRepository, day),
    ]);
    return {
      date: day,
      hasPending: count > 0,
      count,
      topicCount,
      topicIds,
    };
  }
}

module.exports = GetDueReviews;
