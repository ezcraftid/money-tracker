const session = require('express-session');
const SqliteStore = require('better-sqlite3-session-store')(session);
const db = require('../db');
const config = require('./index');

module.exports = session({
  store: new SqliteStore({ client: db, expired: { clear: true, intervalMs: 15 * 60 * 1000 } }),
  secret: config.sessionSecret,
  name: 'mt.sid',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: config.https || config.trustProxy > 0, maxAge: 8 * 60 * 60 * 1000 },
});
