class UserAnswerRepository {
  async findByAttemptId(attemptId) {
    throw new Error('UserAnswerRepository.findByAttemptId() not implemented.');
  }

  async create(data, client) {
    throw new Error('UserAnswerRepository.create() not implemented.');
  }

  async setCorrect(attemptId, flashcardId, isCorrect, client) {
    throw new Error('UserAnswerRepository.setCorrect() not implemented.');
  }

  async countAttemptsByDay() {
    throw new Error('UserAnswerRepository.countAttemptsByDay() not implemented.');
  }

  async listAttemptStartedAt() {
    throw new Error('UserAnswerRepository.listAttemptStartedAt() not implemented.');
  }
}

module.exports = UserAnswerRepository;
