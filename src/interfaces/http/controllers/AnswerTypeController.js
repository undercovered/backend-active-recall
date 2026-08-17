const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess } = require('../httpResponse');

class AnswerTypeController {
  constructor({ getAllAnswerTypes }) {
    this.getAllAnswerTypes = getAllAnswerTypes;
  }

  getAll = asyncHandler(async (_req, res) => {
    const types = await this.getAllAnswerTypes.execute();
    return sendSuccess(res, { data: types, msg: '' });
  });
}

module.exports = AnswerTypeController;
