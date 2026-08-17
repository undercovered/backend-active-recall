const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess } = require('../httpResponse');

class DashboardController {
  constructor({ getDashboardStats }) {
    this.getDashboardStats = getDashboardStats;
  }

  /** GET /api/dashboard/stats?date=YYYY-MM-DD */
  stats = asyncHandler(async (req, res) => {
    const data = await this.getDashboardStats.execute({ date: req.query.date });
    return sendSuccess(res, { data, msg: '' });
  });
}

module.exports = DashboardController;
