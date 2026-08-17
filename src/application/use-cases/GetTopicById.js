const NotFoundError = require('../../domain/errors/NotFoundError');

/**
 * Use case: fetch a topic by id, including its flashcard, answers and recall dates.
 */
class GetTopicById {
  constructor({
    topicRepository,
    flashcardRepository,
    answerRepository,
    answerTypeRepository,
    activeRecallRepository,
  }) {
    this.topicRepository = topicRepository;
    this.flashcardRepository = flashcardRepository;
    this.answerRepository = answerRepository;
    this.answerTypeRepository = answerTypeRepository;
    this.activeRecallRepository = activeRecallRepository;
  }

  async execute(id) {
    const topic = await this.topicRepository.findById(id);
    if (!topic) {
      throw new NotFoundError('Tema no encontrado.');
    }

    const [flashcards, recalls] = await Promise.all([
      this.flashcardRepository.findByTopicId(topic.id),
      this.activeRecallRepository.findByTopicId(topic.id),
    ]);

    const hydrated = [];
    for (const card of flashcards) {
      const [answers, answerType] = await Promise.all([
        this.answerRepository.findByFlashcardId(card.id),
        this.answerTypeRepository.findById(card.answerTypeId),
      ]);
      hydrated.push({
        ...card.toJSON(),
        answerType: answerType ? answerType.toJSON() : null,
        answers: answers.map((a) => a.toJSON()),
      });
    }

    return {
      ...topic.toJSON(),
      flashcard: hydrated[0] ?? null,
      flashcards: hydrated,
      recalls: recalls.map((r) => r.toJSON()),
    };
  }
}

module.exports = GetTopicById;
