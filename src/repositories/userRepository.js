const db = require('../db');

module.exports = {
  count: () => db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
  findByUsername: (username) => db.prepare('SELECT * FROM users WHERE username = ?').get(username),
  create: (username, passwordHash) =>
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash).lastInsertRowid,
};
