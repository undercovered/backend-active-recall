const NotFoundError = require('../../domain/errors/NotFoundError');
const { hydrateFlashcard } = require('../questionAnswers');

class GetFlashcardById {
  constructor({
    flashcardRepository,
    topicRepository,
    subjectRepository,
    answerRepository,
    answerTypeRepository,
  }) {
    this.flashcardRepository = flashcardRepository;
    this.topicRepository = topicRepository;
    this.subjectRepository = subjectRepository;
    this.answerRepository = answerRepository;
    this.answerTypeRepository = answerTypeRepository;
  }

  async execute(id) {
    const card = await this.flashcardRepository.findById(id);
    if (!card) {
      throw new NotFoundError('Pregunta no encontrada.');
    }

    const [topic, subject, answers, answerType] = await Promise.all([
      this.topicRepository.findById(card.topicId),
      this.subjectRepository.findById(card.subjectId),
      this.answerRepository.findByFlashcardId(card.id),
      this.answerTypeRepository.findById(card.answerTypeId),
    ]);
    if (!topic || !subject) {
      throw new NotFoundError('Pregunta no encontrada.');
    }

    return hydrateFlashcard(card, answerType, answers, {
      topicTitle: topic.title,
      subjectTitle: subject.title,
    });
  }
}

module.exports = GetFlashcardById;
