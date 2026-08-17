const ValidationError = require('./errors/ValidationError');

function resolveReviewDate(date) {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return String(date);
  }
  if (date) {
    throw new ValidationError('La fecha debe tener el formato YYYY-MM-DD.');
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

module.exports = { resolveReviewDate };
