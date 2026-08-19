const { hydrateFlashcard } = require('../questionAnswers');

class GetAllFlashcards {
  constructor({
    flashcardRepository,
    answerRepository,
    answerTypeRepository,
  }) {
    this.flashcardRepository = flashcardRepository;
    this.answerRepository = answerRepository;
    this.answerTypeRepository = answerTypeRepository;
  }

  async execute({ search, subjectId, topicId } = {}) {
    const rows = await this.flashcardRepository.findAllListed({
      search,
      subjectId,
      topicId,
    });
    if (!rows.length) {
      return [];
    }

    const answers = await this.answerRepository.findByFlashcardIds(
      rows.map((row) => row.id),
    );
    const answersByCard = new Map();
    for (const answer of answers) {
      const list = answersByCard.get(answer.flashcardId) ?? [];
      list.push(answer);
      answersByCard.set(answer.flashcardId, list);
    }

    const types = new Map();
    const result = [];
    for (const row of rows) {
      let type = types.get(row.answer_type_id);
      if (!type) {
        type = await this.answerTypeRepository.findById(row.answer_type_id);
        types.set(row.answer_type_id, type);
      }
      result.push(
        hydrateFlashcard(
          {
            toJSON: () => ({
              id: row.id,
              question: row.question,
              topicId: row.topic_id,
              subjectId: row.subject_id,
              answerTypeId: row.answer_type_id,
              deleted: row.deleted === true,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            }),
          },
          type,
          answersByCard.get(row.id) ?? [],
          {
            topicTitle: row.topic_title,
            subjectTitle: row.subject_title,
          },
        ),
      );
    }
    return result;
  }
}

module.exports = GetAllFlashcards;
