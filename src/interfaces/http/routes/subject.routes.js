const { Router } = require('express');
const {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} = require('../../../infrastructure/container');
const SubjectController = require('../controllers/SubjectController');

const router = Router();
const controller = new SubjectController({
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
});

router.get('/', controller.getAll); // GET    /api/subjects?search=
router.get('/:id', controller.getById); // GET    /api/subjects/:id
router.post('/', controller.create); // POST   /api/subjects
router.put('/:id', controller.update); // PUT    /api/subjects/:id
router.delete('/:id', controller.remove); // DELETE /api/subjects/:id

module.exports = router;
