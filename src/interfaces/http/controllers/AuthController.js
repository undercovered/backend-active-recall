const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess } = require('../httpResponse');

class AuthController {
  constructor({ loginUser, registerUser, getCurrentUser }) {
    this.loginUser = loginUser;
    this.registerUser = registerUser;
    this.getCurrentUser = getCurrentUser;
  }

  /** POST /api/auth/login */
  login = asyncHandler(async (req, res) => {
    const { identifier, username, email, password } = req.body ?? {};
    const data = await this.loginUser.execute({
      identifier: identifier ?? username ?? email,
      password,
    });
    return sendSuccess(res, {
      data,
      msg: 'Sesión iniciada correctamente.',
    });
  });

  /** POST /api/auth/register */
  register = asyncHandler(async (req, res) => {
    const {
      firstName,
      lastName,
      email,
      username,
      phoneCountryCode,
      phone,
      password,
    } = req.body ?? {};
    const user = await this.registerUser.execute({
      firstName,
      lastName,
      email,
      username,
      phoneCountryCode,
      phone,
      password,
    });
    return sendSuccess(res, {
      status: 201,
      data: user,
      msg: 'Cuenta creada correctamente. Ya puedes iniciar sesión.',
    });
  });

  /** GET /api/auth/me */
  me = asyncHandler(async (req, res) => {
    const data = await this.getCurrentUser.execute(req.user.id);
    return sendSuccess(res, { data, msg: '' });
  });
}

module.exports = AuthController;
