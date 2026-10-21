const db = require('../db');

function list(kind) {
  if (kind) {
    return db.prepare('SELECT * FROM categories WHERE kind = ? ORDER BY name').all(kind);
  }
  return db.prepare('SELECT * FROM categories ORDER BY kind, name').all();
}

function findById(id) {
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

function create({ name, kind }) {
  return db.prepare('INSERT INTO categories (name, kind) VALUES (?, ?)').run(name, kind).lastInsertRowid;
}

function update(id, { name }) {
  return db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id).changes;
}

function remove(id) {
  return db.prepare('DELETE FROM categories WHERE id = ?').run(id).changes;
}

function countUsage(id) {
  const tx = db.prepare('SELECT COUNT(*) AS n FROM transactions WHERE category_id = ?').get(id).n;
  const budget = db.prepare('SELECT COUNT(*) AS n FROM budgets WHERE category_id = ?').get(id).n;
  return tx + budget;
}

module.exports = { list, findById, create, update, remove, countUsage };
