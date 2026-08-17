const INITIAL_STABILITY = 7;
const EASE_FACTOR = 2.5;
const REVIEWS_FOR_FULL_RETENTION = 7;

function toYmd(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const raw = String(value ?? '');
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return toYmd(parsed);
}

function daysBetween(from, to) {
  const start = toYmd(from);
  const end = toYmd(to);
  if (!start || !end) return 0;
  const [ys, ms, ds] = start.split('-').map(Number);
  const [ye, me, de] = end.split('-').map(Number);
  const a = Date.UTC(ys, ms - 1, ds);
  const b = Date.UTC(ye, me - 1, de);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function stabilityAfterSuccesses(successCount) {
  return INITIAL_STABILITY * EASE_FACTOR ** successCount;
}

/**
 * Retention % for one topic.
 * t = days since last successful review, or since the topic was learned.
 * After 7 successful reviews the memory is treated as permanent (100%).
 */
function topicRetention({ learnedAt, recalls = [], today }) {
  const successful = [...recalls]
    .filter((r) => r.completed === true)
    .sort((a, b) =>
      String(toYmd(b.dateRecall)).localeCompare(String(toYmd(a.dateRecall))),
    );

  if (successful.length >= REVIEWS_FOR_FULL_RETENTION) {
    return 100;
  }

  const lastSuccess = successful[0];
  const origin = lastSuccess?.dateRecall ?? learnedAt;
  const t = daysBetween(origin, today);
  const S = stabilityAfterSuccesses(successful.length);
  return 100 * Math.exp(-t / S);
}

/**
 * Mean of R(t) across topics. Null when there are no topics.
 */
function averageRetention(topics, today) {
  if (!topics.length) return null;
  const sum = topics.reduce(
    (acc, topic) => acc + topicRetention({ ...topic, today }),
    0,
  );
  return Math.round((sum / topics.length) * 10) / 10;
}

module.exports = {
  INITIAL_STABILITY,
  EASE_FACTOR,
  REVIEWS_FOR_FULL_RETENTION,
  toYmd,
  daysBetween,
  stabilityAfterSuccesses,
  topicRetention,
  averageRetention,
};
