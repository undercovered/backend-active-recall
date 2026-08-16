const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess } = require('../httpResponse');

/**
 * SubjectController (interface layer).
 *
 * Adapts HTTP requests/responses to the application use cases. Handlers are
 * wrapped with asyncHandler, so thrown errors flow to the central error
 * middleware — no try/catch here. Successful responses use the { data, msg }
 * envelope via sendSuccess().
 */
class SubjectController {
  /**
   * @param {{ createSubject: import('../../../application/use-cases/CreateSubject') }} deps
   */
  constructor({ createSubject }) {
    this.createSubject = createSubject;
  }

  /**
   * POST /api/subjects
   */
  create = asyncHandler(async (req, res) => {
    const { title, description } = req.body ?? {};
    const subject = await this.createSubject.execute({ title, description });
    return sendSuccess(res, {
      status: 201,
      data: subject,
      msg: 'Materia creada correctamente.',
    });
  });
}

module.exports = SubjectController;
