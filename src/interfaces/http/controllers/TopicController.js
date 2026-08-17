const asyncHandler = require('../middlewares/asyncHandler');
const { sendSuccess } = require('../httpResponse');

class TopicController {
  constructor({
    createTopic,
    getAllTopics,
    getTopicById,
    updateTopic,
    deleteTopic,
  }) {
    this.createTopic = createTopic;
    this.getAllTopics = getAllTopics;
    this.getTopicById = getTopicById;
    this.updateTopic = updateTopic;
    this.deleteTopic = deleteTopic;
  }

  /** GET /api/topics?search=&subjectId= */
  getAll = asyncHandler(async (req, res) => {
    const { search, subjectId } = req.query;
    const topics = await this.getAllTopics.execute({ search, subjectId });
    return sendSuccess(res, { data: topics, msg: '' });
  });

  /** GET /api/topics/:id */
  getById = asyncHandler(async (req, res) => {
    const topic = await this.getTopicById.execute(req.params.id);
    return sendSuccess(res, { data: topic, msg: '' });
  });

  /** POST /api/topics */
  create = asyncHandler(async (req, res) => {
    const {
      title,
      description,
      subjectId,
      questions,
      question,
      answerTypeCode,
      answers,
    } = req.body ?? {};
    const topic = await this.createTopic.execute({
      title,
      description,
      subjectId,
      questions,
      question,
      answerTypeCode,
      answers,
    });
    return sendSuccess(res, {
      status: 201,
      data: topic,
      msg: 'Tema creado correctamente.',
    });
  });

  /** PUT /api/topics/:id */
  update = asyncHandler(async (req, res) => {
    const { title, description } = req.body ?? {};
    const topic = await this.updateTopic.execute(req.params.id, {
      title,
      description,
    });
    return sendSuccess(res, {
      data: topic,
      msg: 'Tema actualizado correctamente.',
    });
  });

  /** DELETE /api/topics/:id */
  remove = asyncHandler(async (req, res) => {
    const result = await this.deleteTopic.execute(req.params.id);
    return sendSuccess(res, {
      data: result,
      msg: 'Tema eliminado correctamente.',
    });
  });
}

module.exports = TopicController;
