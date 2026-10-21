# TASK 02 — SQLite database

## src/db/index.js
```js
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
```

## src/db/migrate.js
```js
const fs = require('fs');
const path = require('path');
const db = require('./index');

function migrate() {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  const applied = new Set(db.prepare('SELECT name FROM schema_migrations').all().map(r => r.name));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (name) VALUES (?)').run(file);
    })();
    console.log('Applied migration:', file);
  }
}

module.exports = migrate;
```

## src/db/migrations/001_init.sql
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('cash','bank','ewallet')),
  initial_balance INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income','expense')),
  UNIQUE (name, kind)
);

CREATE TABLE import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL CHECK (source IN ('csv','pdf','screenshot')),
  filename TEXT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','committed','discarded')),
  payload TEXT,                      -- JSON of parsed rows while pending; set to NULL after commit/discard
  warnings TEXT,                     -- JSON array of warning strings
  rows_total INTEGER NOT NULL DEFAULT 0,
  rows_added INTEGER NOT NULL DEFAULT 0,
  rows_skipped INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  category_id INTEGER REFERENCES categories(id),
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  date TEXT NOT NULL,                -- YYYY-MM-DD
  description TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','csv','pdf','screenshot')),
  import_batch_id INTEGER REFERENCES import_batches(id),
  dedupe_hash TEXT NOT NULL UNIQUE,  -- manual rows use 'manual:<uuid>'
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_tx_date ON transactions(date);
CREATE INDEX idx_tx_account ON transactions(account_id);
CREATE INDEX idx_tx_category ON transactions(category_id);

CREATE TABLE budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL UNIQUE REFERENCES categories(id),
  monthly_limit INTEGER NOT NULL CHECK (monthly_limit > 0)
);
```

## src/db/migrations/002_seed.sql
```sql
INSERT INTO categories (name, kind) VALUES
  ('Makan & Minum','expense'), ('Transportasi','expense'), ('Belanja','expense'),
  ('Tagihan','expense'), ('Hiburan','expense'), ('Kesehatan','expense'),
  ('Pendidikan','expense'), ('Lainnya','expense'),
  ('Gaji','income'), ('Uang Saku','income'), ('Lainnya','income');
```

## Repositories (src/repositories/)
Each file exports plain functions. Prepare statements INSIDE functions.

### userRepository.js (write exactly)
```js
const db = require('../db');

module.exports = {
  count: () => db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
  findByUsername: (username) => db.prepare('SELECT * FROM users WHERE username = ?').get(username),
  create: (username, passwordHash) =>
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash).lastInsertRowid,
};
```

### transactionRepository.js (write exactly)
```js
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
```

### Other repositories — write in the same style, with EXACTLY these exports
- `accountRepository.js`: `list()`, `findById(id)`, `create({name,type,initialBalance})`, `update(id,{name,type,initialBalance})`, `remove(id)`, `countTransactions(id)`
- `categoryRepository.js`: `list(kind?)`, `findById(id)`, `create({name,kind})`, `update(id,{name})`, `remove(id)`, `countUsage(id)` (transactions + budgets using it)
- `budgetRepository.js`: `list()` (join category name), `upsert(categoryId, monthlyLimit)` (use `INSERT ... ON CONFLICT(category_id) DO UPDATE`), `remove(categoryId)`
- `importBatchRepository.js`: `create({source,filename,accountId,payload,warnings,rowsTotal})`, `findById(id)`, `markCommitted(id,{rowsAdded,rowsSkipped})` (sets status, clears payload), `markDiscarded(id)` (sets status, clears payload), `listRecent(limit)`

## Wire into server.js
Call `require('./src/db/migrate')()` BEFORE `require('./src/app')`:
```js
const config = require('./src/config');
require('./src/db/migrate')();
const createApp = require('./src/app');
// ...rest unchanged
```

## Done check
- [ ] `npm start` creates `data/app.db`
- [ ] Console shows "Applied migration: 001_init.sql" and "002_seed.sql" on first run only
- [ ] Restarting does not re-apply migrations
- [ ] No SQL string contains user input; no `db.prepare` at module top level
