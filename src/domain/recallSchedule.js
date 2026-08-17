/**
 * Spaced-repetition intervals applied sequentially from the topic
 * creation date (each step is added on top of the previous one):
 *
 *   1. +1 day     → Day 1  (tomorrow)
 *   2. +3 days    → Day 4
 *   3. +7 days    → Day 11 (~ week 2)
 *   4. +15 days   → Day 26 (~ week 4)
 *   5. +30 days   → ~2 months from creation
 *   6. +3 months  → deep maintenance
 *   7. +6 months  → lifelong retention
 *
 * @param {Date} [from]
 * @returns {Date[]}
 */
function buildRecallDates(from = new Date()) {
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  const steps = [
    { days: 1 },
    { days: 3 },
    { days: 7 },
    { days: 15 },
    { days: 30 },
    { months: 3 },
    { months: 6 },
  ];

  return steps.map((step) => {
    if (step.days) {
      cursor.setDate(cursor.getDate() + step.days);
    }
    if (step.months) {
      cursor.setMonth(cursor.getMonth() + step.months);
    }
    return new Date(cursor);
  });
}

module.exports = { buildRecallDates };
