/**
 * Coerce DB / JSON flags. Missing values stay at the safe default
 * so older rows and in-memory fixtures keep working.
 */
function asDeleted(value) {
  return value === true || value === 't' || value === 'true';
}

function asEnabled(value) {
  if (value === undefined || value === null) {
    return true;
  }
  return value !== false && value !== 'f' && value !== 'false';
}

module.exports = { asDeleted, asEnabled };
