const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess } = require('../httpResponse');

class FlashcardController {
  constructor({
    getAllFlashcards,
    getFlashcardById,
    createFlashcard,
    updateFlashcard,
    deleteFlashcard,
  }) {
    this.getAllFlashcards = getAllFlashcards;
    this.getFlashcardById = getFlashcardById;
    this.createFlashcard = createFlashcard;
    this.updateFlashcard = updateFlashcard;
    this.deleteFlashcard = deleteFlashcard;
  }

  getAll = asyncHandler(async (req, res) => {
    const { search, subjectId, topicId } = req.query;
    const cards = await this.getAllFlashcards.execute({
      search,
      subjectId,
      topicId,
    });
    return sendSuccess(res, { data: cards, msg: '' });
  });

  getById = asyncHandler(async (req, res) => {
    const card = await this.getFlashcardById.execute(req.params.id);
    return sendSuccess(res, { data: card, msg: '' });
  });

  create = asyncHandler(async (req, res) => {
    const { topicId, question, answerTypeCode, answers } = req.body ?? {};
    const card = await this.createFlashcard.execute({
      topicId,
      question,
      answerTypeCode,
      answers,
    });
    return sendSuccess(res, {
      status: 201,
      data: card,
      msg: 'Pregunta creada correctamente.',
    });
  });

  update = asyncHandler(async (req, res) => {
    const { question, answerTypeCode, answers } = req.body ?? {};
    const card = await this.updateFlashcard.execute(req.params.id, {
      question,
      answerTypeCode,
      answers,
    });
    return sendSuccess(res, {
      data: card,
      msg: 'Pregunta actualizada correctamente.',
    });
  });

  remove = asyncHandler(async (req, res) => {
    const result = await this.deleteFlashcard.execute(req.params.id);
    return sendSuccess(res, {
      data: result,
      msg: 'Pregunta eliminada correctamente.',
    });
  });
}

module.exports = FlashcardController;
