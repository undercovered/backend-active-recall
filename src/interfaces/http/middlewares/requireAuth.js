const AuthError = require('../../../domain/errors/AuthError');
const { verifyToken } = require('../../../infrastructure/security/tokenService');
const asyncHandler = require('./asyncHandler');

function readBearer(req) {
  const header = req.headers?.authorization ?? req.headers?.Authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

/**
 * Requires a valid Bearer JWT. When a userRepository is provided, also
 * rejects deleted or disabled accounts so a leftover token cannot be used.
 */
function createRequireAuth({ userRepository } = {}) {
  return asyncHandler(async (req, res, next) => {
    const token = readBearer(req);
    if (!token) {
      throw new AuthError(
        'Necesitas iniciar sesión para continuar.',
        'AUTH_SESSION_REQUIRED',
      );
    }

    const payload = verifyToken(token);
    if (!payload?.sub) {
      throw new AuthError('La sesión no es válida.', 'AUTH_INVALID_TOKEN');
    }

    if (userRepository) {
      const user = await userRepository.findById(payload.sub);
      if (!user) {
        throw new AuthError('La sesión ya no es válida.', 'AUTH_USER_NOT_FOUND');
      }
      if (!user.enabled) {
        throw new AuthError(
          'Esta cuenta está deshabilitada.',
          'AUTH_USER_DISABLED',
          403,
        );
      }
      req.user = { id: user.id, username: user.username };
    } else {
      req.user = { id: payload.sub, username: payload.username };
    }

    next();
  });
}

const requireAuth = createRequireAuth();
requireAuth.createRequireAuth = createRequireAuth;

module.exports = requireAuth;
