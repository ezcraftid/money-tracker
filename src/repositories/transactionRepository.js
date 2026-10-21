const db = require('../db');

function create(tx) {
  const row = { categoryId: null, importBatchId: null, source: 'manual', ...tx };
  return db.prepare(`
    INSERT INTO transactions (account_id, category_id, type, amount, date, description, source, import_batch_id, dedupe_hash)
    VALUES (@accountId, @categoryId, @type, @amount, @date, @description, @source, @importBatchId, @dedupeHash)
  `).run(row).lastInsertRowid;
}

function findById(id) {
  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
}

function existsByHash(hash) {
  return Boolean(db.prepare('SELECT 1 FROM transactions WHERE dedupe_hash = ?').get(hash));
}

// Filters are optional. WHERE parts are fixed strings; values are always bound.
function buildWhere({ from, to, accountId, categoryId }) {
  const where = []; const params = [];
  if (from) { where.push('t.date >= ?'); params.push(from); }
  if (to) { where.push('t.date <= ?'); params.push(to); }
  if (accountId) { where.push('t.account_id = ?'); params.push(accountId); }
  if (categoryId) { where.push('t.category_id = ?'); params.push(categoryId); }
  return { clause: where.length ? 'WHERE ' + where.join(' AND ') : '', params };
}

function list(filters, limit = 50, offset = 0) {
  const { clause, params } = buildWhere(filters);
  return db.prepare(`
    SELECT t.*, a.name AS account_name, c.name AS category_name
    FROM transactions t
    JOIN accounts a ON a.id = t.account_id
    LEFT JOIN categories c ON c.id = t.category_id
    ${clause}
    ORDER BY t.date DESC, t.id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
}

function count(filters) {
  const { clause, params } = buildWhere(filters);
  return db.prepare(`SELECT COUNT(*) AS n FROM transactions t ${clause}`).get(...params).n;
}

function update(id, tx) {
  return db.prepare(`
    UPDATE transactions SET account_id=@accountId, category_id=@categoryId, type=@type,
      amount=@amount, date=@date, description=@description WHERE id=@id
  `).run({ ...tx, id }).changes;
}

function remove(id) {
  return db.prepare('DELETE FROM transactions WHERE id = ?').run(id).changes;
}

module.exports = { create, findById, existsByHash, list, count, update, remove };
