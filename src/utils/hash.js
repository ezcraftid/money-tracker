const crypto = require('crypto');

// `occurrence` = n-th identical row inside the same document (0, 1, 2...).
// This keeps two real purchases of the same amount on the same day from being treated as duplicates,
// while re-importing the same document still matches row by row.
function makeDedupeHash({ accountId, date, type, amount, description }, occurrence = 0) {
  const norm = String(description).toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update([accountId, date, type, amount, norm, occurrence].join('|')).digest('hex');
}
module.exports = { makeDedupeHash };
