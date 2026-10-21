const db = require('../db');

function list() {
  return db.prepare('SELECT * FROM accounts ORDER BY name').all();
}

function findById(id) {
  return db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
}

function create({ name, type, initialBalance }) {
  return db.prepare(`
    INSERT INTO accounts (name, type, initial_balance) VALUES (?, ?, ?)
  `).run(name, type, initialBalance).lastInsertRowid;
}

function update(id, { name, type, initialBalance }) {
  return db.prepare(`
    UPDATE accounts SET name = ?, type = ?, initial_balance = ? WHERE id = ?
  `).run(name, type, initialBalance, id).changes;
}

function remove(id) {
  return db.prepare('DELETE FROM accounts WHERE id = ?').run(id).changes;
}

function countTransactions(id) {
  return db.prepare('SELECT COUNT(*) AS n FROM transactions WHERE account_id = ?').get(id).n;
}

module.exports = { list, findById, create, update, remove, countTransactions };
