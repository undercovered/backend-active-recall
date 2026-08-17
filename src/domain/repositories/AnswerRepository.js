class AnswerRepository {
  async findByFlashcardId(flashcardId) {
    throw new Error('AnswerRepository.findByFlashcardId() not implemented.');
  }

  async create(data, client) {
    throw new Error('AnswerRepository.create() not implemented.');
  }
}

module.exports = AnswerRepository;
