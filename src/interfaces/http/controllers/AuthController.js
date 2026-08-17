const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess } = require('../httpResponse');

class AuthController {
  constructor({ loginUser, registerUser, getCurrentUser, requestPasswordReset }) {
    this.loginUser = loginUser;
    this.registerUser = registerUser;
    this.getCurrentUser = getCurrentUser;
    this.requestPasswordReset = requestPasswordReset;
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
      passwordConfirm,
    } = req.body ?? {};
    const user = await this.registerUser.execute({
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
      msg: 'Cuenta creada correctamente. Ya puedes iniciar sesión.',
    });
  });

  /** POST /api/auth/password-reset */
  requestReset = asyncHandler(async (req, res) => {
    const data = await this.requestPasswordReset.execute({
      email: req.body?.email,
    });
    return sendSuccess(res, {
      data,
      msg: 'Se ha enviado el correo de confirmación de cambio de contraseña.',
    });
  });

  /** GET /api/auth/me */
  me = asyncHandler(async (req, res) => {
    const data = await this.getCurrentUser.execute(req.user.id);
    return sendSuccess(res, { data, msg: '' });
  });
}

module.exports = AuthController;
