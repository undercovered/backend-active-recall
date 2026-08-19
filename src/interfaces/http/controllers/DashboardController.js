const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess } = require('../httpResponse');

class DashboardController {
  constructor({ getDashboardStats, getStudyStreak }) {
    this.getDashboardStats = getDashboardStats;
    this.getStudyStreak = getStudyStreak;
  }

  /** GET /api/dashboard/stats?date=YYYY-MM-DD */
  stats = asyncHandler(async (req, res) => {
    const data = await this.getDashboardStats.execute({ date: req.query.date });
    return sendSuccess(res, { data, msg: '' });
  });

  /** GET /api/dashboard/streak?date=YYYY-MM-DD */
  streak = asyncHandler(async (req, res) => {
    const data = await this.getStudyStreak.execute({
      date: req.query.date,
      userId: req.user?.id,
    });
    return sendSuccess(res, { data, msg: '' });
  });
}

module.exports = DashboardController;
