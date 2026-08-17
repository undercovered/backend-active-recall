const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess } = require('../httpResponse');

class UserController {
  constructor({ createUser }) {
    this.createUser = createUser;
  }

  /** POST /api/users */
  create = asyncHandler(async (req, res) => {
    const {
      firstName,
      lastName,
      email,
      username,
      phoneCountryCode,
      phone,
      password,
      passwordConfirm,
    } = req.body ?? {};
    const user = await this.createUser.execute({
      firstName,
      lastName,
      email,
      username,
      phoneCountryCode,
      phone,
      password,
      passwordConfirm,
    });
    return sendSuccess(res, {
      status: 201,
      data: user,
      msg: 'Usuario creado correctamente.',
    });
  });
}

module.exports = UserController;
