const db = require('../db');

function create({ source, filename, accountId, payload, warnings, rowsTotal }) {
  return db.prepare(`
    INSERT INTO import_batches (source, filename, account_id, payload, warnings, rows_total)
    VALUES (@source, @filename, @accountId, @payload, @warnings, @rowsTotal)
  `).run({
    source,
    filename: filename || null,
    accountId,
    payload: payload === undefined ? null : payload,
    warnings: warnings === undefined ? null : warnings,
    rowsTotal: rowsTotal || 0,
  }).lastInsertRowid;
}

function findById(id) {
  return db.prepare('SELECT * FROM import_batches WHERE id = ?').get(id);
}

function markCommitted(id, { rowsAdded, rowsSkipped }) {
  return db.prepare(`
    UPDATE import_batches
    SET status = 'committed', payload = NULL, rows_added = ?, rows_skipped = ?
    WHERE id = ?
  `).run(rowsAdded || 0, rowsSkipped || 0, id).changes;
}

function markDiscarded(id) {
  return db.prepare(`
    UPDATE import_batches SET status = 'discarded', payload = NULL WHERE id = ?
  `).run(id).changes;
}

function listRecent(limit = 20) {
  return db.prepare(`
    SELECT b.*, a.name AS account_name
    FROM import_batches b
    JOIN accounts a ON a.id = b.account_id
    ORDER BY b.id DESC
    LIMIT ?
  `).all(limit);
}

module.exports = { create, findById, markCommitted, markDiscarded, listRecent };
