const ConflictError = require('../domain/errors/ConflictError');
const { resolveReviewDate } = require('../domain/reviewDate');

const TOPIC_REVIEW_DUE_MSG =
  'Este tema tiene un repaso pendiente hoy. Termínalo antes de cambiar las preguntas.';

function topicIdOf(row) {
  return row?.topic_id ?? row?.topicId ?? null;
}

async function dueTopicIds(activeRecallRepository, date) {
  const day = resolveReviewDate(date);
  const due = await activeRecallRepository.findDueOn(day);
  return [...new Set((due ?? []).map(topicIdOf).filter(Boolean))];
}

async function assertTopicUnlocked(activeRecallRepository, topicId, date) {
  if (!topicId) {
    return;
  }
  const ids = await dueTopicIds(activeRecallRepository, date);
  if (ids.includes(topicId)) {
    throw new ConflictError(TOPIC_REVIEW_DUE_MSG, 'TOPIC_REVIEW_DUE');
  }
}

module.exports = {
  TOPIC_REVIEW_DUE_MSG,
  dueTopicIds,
  assertTopicUnlocked,
};
