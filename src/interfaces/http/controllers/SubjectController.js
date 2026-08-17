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
   * @param {{
   *   createSubject: import('../../../application/use-cases/CreateSubject'),
   *   getAllSubjects: import('../../../application/use-cases/GetAllSubjects'),
   *   getSubjectById: import('../../../application/use-cases/GetSubjectById'),
   *   updateSubject: import('../../../application/use-cases/UpdateSubject'),
   *   deleteSubject: import('../../../application/use-cases/DeleteSubject'),
   * }} deps
   */
  constructor({
    createSubject,
    getAllSubjects,
    getSubjectById,
    updateSubject,
    deleteSubject,
  }) {
    this.createSubject = createSubject;
    this.getAllSubjects = getAllSubjects;
    this.getSubjectById = getSubjectById;
    this.updateSubject = updateSubject;
    this.deleteSubject = deleteSubject;
  }

  /** GET /api/subjects?search= */
  getAll = asyncHandler(async (req, res) => {
    const { search } = req.query;
    const subjects = await this.getAllSubjects.execute({ search });
    return sendSuccess(res, { data: subjects, msg: '' });
  });

  /** GET /api/subjects/:id */
  getById = asyncHandler(async (req, res) => {
    const subject = await this.getSubjectById.execute(req.params.id);
    return sendSuccess(res, { data: subject, msg: '' });
  });

  /** POST /api/subjects */
  create = asyncHandler(async (req, res) => {
    const { title, description } = req.body ?? {};
    const subject = await this.createSubject.execute({ title, description });
    return sendSuccess(res, {
      status: 201,
      data: subject,
      msg: 'Materia creada correctamente.',
    });
  });

  /** PUT /api/subjects/:id */
  update = asyncHandler(async (req, res) => {
    const { title, description } = req.body ?? {};
    const subject = await this.updateSubject.execute(req.params.id, {
      title,
      description,
    });
    return sendSuccess(res, {
      data: subject,
      msg: 'Materia actualizada correctamente.',
    });
  });

  /** DELETE /api/subjects/:id */
  remove = asyncHandler(async (req, res) => {
    const result = await this.deleteSubject.execute(req.params.id);
    return sendSuccess(res, {
      data: result,
      msg: 'Materia eliminada correctamente.',
    });
  });
}

module.exports = SubjectController;
