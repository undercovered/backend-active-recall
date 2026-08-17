const { Router } = require('express');
const {
  createTopic,
  getAllTopics,
  getTopicById,
  updateTopic,
  deleteTopic,
} = require('../../../infrastructure/container');
const TopicController = require('../controllers/TopicController');

const router = Router();
const controller = new TopicController({
  createTopic,
  getAllTopics,
  getTopicById,
  updateTopic,
  deleteTopic,
});

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
