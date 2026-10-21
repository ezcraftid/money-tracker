const db = require('../db');

function list() {
  return db.prepare(`
    SELECT b.*, c.name AS category_name, c.kind AS category_kind
    FROM budgets b
    JOIN categories c ON c.id = b.category_id
    ORDER BY c.name
  `).all();
}

function upsert(categoryId, monthlyLimit) {
  return db.prepare(`
    INSERT INTO budgets (category_id, monthly_limit) VALUES (@categoryId, @monthlyLimit)
    ON CONFLICT(category_id) DO UPDATE SET monthly_limit = @monthlyLimit
  `).run({ categoryId, monthlyLimit }).changes;
}

function remove(categoryId) {
  return db.prepare('DELETE FROM budgets WHERE category_id = ?').run(categoryId).changes;
}

module.exports = { list, upsert, remove };
