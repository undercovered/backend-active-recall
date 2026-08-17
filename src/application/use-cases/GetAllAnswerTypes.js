class GetAllAnswerTypes {
  constructor({ answerTypeRepository }) {
    this.answerTypeRepository = answerTypeRepository;
  }

  async execute() {
    return this.answerTypeRepository.findAll();
  }
}

module.exports = GetAllAnswerTypes;
