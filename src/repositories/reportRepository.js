const db = require('../db');

function totalsByType(from, to) {
  return db.prepare(`
    SELECT type, COALESCE(SUM(amount), 0) AS total
    FROM transactions WHERE date BETWEEN ? AND ? GROUP BY type
  `).all(from, to);
}

function expenseByCategory(from, to) {
  return db.prepare(`
    SELECT COALESCE(c.name, 'Tanpa kategori') AS name, SUM(t.amount) AS total
    FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.type = 'expense' AND t.date BETWEEN ? AND ?
    GROUP BY t.category_id ORDER BY total DESC
  `).all(from, to);
}

function accountBalances() {
  return db.prepare(`
    SELECT a.id, a.name, a.initial_balance +
      COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount WHEN t.type = 'expense' THEN -t.amount END), 0) AS balance
    FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id
    GROUP BY a.id ORDER BY a.name
  `).all();
}

function budgetUsage(from, to) {
  return db.prepare(`
    SELECT b.category_id, c.name, b.monthly_limit, COALESCE(SUM(t.amount), 0) AS spent
    FROM budgets b JOIN categories c ON c.id = b.category_id
    LEFT JOIN transactions t ON t.category_id = b.category_id AND t.type = 'expense' AND t.date BETWEEN ? AND ?
    GROUP BY b.id ORDER BY c.name
  `).all(from, to);
}

module.exports = { totalsByType, expenseByCategory, accountBalances, budgetUsage };
