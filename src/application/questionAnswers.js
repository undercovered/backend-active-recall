const ValidationError = require('../domain/errors/ValidationError');

const OPEN = 'open_answer';
const SINGLE = 'single_choice';
const MULTIPLE = 'multiple_choice';

function validateAnswers(code, answers) {
  const list = Array.isArray(answers) ? answers : [];
  const cleaned = list
    .map((a) => ({
      answerText: String(a?.answerText ?? '').trim(),
      isCorrect: Boolean(a?.isCorrect),
    }))
    .filter((a) => a.answerText.length > 0);

  if (code === OPEN) {
    if (cleaned.length === 0) {
      throw new ValidationError('La respuesta abierta es obligatoria.');
    }
    return [{ answerText: cleaned[0].answerText, isCorrect: true }];
  }

  if (cleaned.length < 2) {
    throw new ValidationError(
      'Debes agregar al menos dos opciones de respuesta.',
    );
  }

  const correctCount = cleaned.filter((a) => a.isCorrect).length;
  if (code === SINGLE && correctCount !== 1) {
    throw new ValidationError(
      'Selecciona exactamente una respuesta correcta.',
    );
  }
  if (code === MULTIPLE && correctCount < 1) {
    throw new ValidationError('Marca al menos una respuesta correcta.');
  }

  return cleaned;
}

function hydrateFlashcard(card, answerType, answers, extras = {}) {
  return {
    ...card.toJSON(),
    ...extras,
    answerType: answerType ? answerType.toJSON() : null,
    answers: answers.map((a) => a.toJSON()),
  };
}

module.exports = { OPEN, SINGLE, MULTIPLE, validateAnswers, hydrateFlashcard };
