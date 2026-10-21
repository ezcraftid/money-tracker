# TASK 04 — Auth: first-run setup, login, session, CSRF

## Behavior
- If the `users` table is empty, EVERY page redirects to `/setup` (create username + password).
- After the first user exists, `/setup` redirects to `/login` and can never be used again.
- All other pages require login.

## src/services/authService.js
```js
const bcrypt = require('bcryptjs');
const db = require('../db');
const userRepository = require('../repositories/userRepository');
const { ValidationError } = require('../utils/errors');

const COST = 12;
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', COST);

const needsSetup = () => userRepository.count() === 0;

function validateCredentials(username, password, confirm) {
  const errors = [];
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username || '')) errors.push('Username 3-32 karakter: huruf, angka, titik, strip, garis bawah.');
  if (!password || password.length < 10) errors.push('Password minimal 10 karakter.');
  if (password !== confirm) errors.push('Konfirmasi password tidak sama.');
  if (errors.length) throw new ValidationError(errors);
}

async function createFirstUser(username, password, confirm) {
  validateCredentials(username, password, confirm);
  const hash = await bcrypt.hash(password, COST);
  db.transaction(() => {
    if (userRepository.count() > 0) throw new ValidationError(['Setup sudah dilakukan.']);
    userRepository.create(username, hash);
  })();
}

// Returns the user or null. Always runs one bcrypt compare (hides whether the username exists).
async function verifyLogin(username, password) {
  const user = userRepository.findByUsername(String(username || ''));
  const ok = await bcrypt.compare(String(password || ''), user ? user.password_hash : DUMMY_HASH);
  return user && ok ? user : null;
}

module.exports = { needsSetup, createFirstUser, verifyLogin };
```

## src/config/session.js
```js
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
  cookie: { httpOnly: true, sameSite: 'lax', secure: config.https, maxAge: 8 * 60 * 60 * 1000 },
});
```

## src/middleware/csrf.js
```js
const crypto = require('crypto');

module.exports = function csrf(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  // Token may come from body, query string (multipart uploads), or header.
  const sent = String((req.body && req.body._csrf) || req.query._csrf || req.get('x-csrf-token') || '');
  const a = Buffer.from(sent);
  const b = Buffer.from(req.session.csrfToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).render('pages/error', { title: 'Ditolak', message: 'Sesi tidak valid. Muat ulang halaman lalu coba lagi.' });
  }
  next();
};
```
Rule for later tasks: forms that upload files (`multipart/form-data`) MUST put the token in the action URL: `action="/import/upload?_csrf=<%= csrfToken %>"`.

## src/middleware/auth.js
```js
const authService = require('../services/authService');

function setupGuard(req, res, next) {
  const needs = authService.needsSetup();
  if (needs && req.path !== '/setup') return res.redirect('/setup');
  if (!needs && req.path === '/setup') return res.redirect('/login');
  next();
}

function requireAuth(req, res, next) {
  res.locals.isLoggedIn = Boolean(req.session.userId);
  if (!req.session.userId) return res.redirect('/login');
  next();
}

module.exports = { setupGuard, requireAuth };
```

## Controller + routes
`src/controllers/authController.js` exports: `showSetup`, `setup`, `showLogin`, `login`, `logout`. Pattern:
```js
exports.login = async (req, res, next) => {
  const user = await authService.verifyLogin(req.body.username, req.body.password);
  if (!user) {
    return res.status(401).render('pages/login', { title: 'Masuk', error: 'Username atau password salah.' });
  }
  // regenerate session id to prevent session fixation
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = user.id;
    req.session.save((err2) => (err2 ? next(err2) : res.redirect('/')));
  });
};
```
- `setup`: call `authService.createFirstUser(...)`. On `ValidationError` re-render `pages/setup` with `errors` (array) and the entered username (never the password). On success: flash "Akun dibuat. Silakan masuk." and redirect `/login`.
- `logout` (POST only): `req.session.destroy(() => res.redirect('/login'))`.

`src/routes/auth.js`:
```js
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../utils/asyncHandler');
const c = require('../controllers/authController');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 5, skipSuccessfulRequests: true,
  handler: (req, res) => res.status(429).render('pages/login', { title: 'Masuk', error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' }),
});

router.get('/setup', c.showSetup);
router.post('/setup', asyncHandler(c.setup));
router.get('/login', c.showLogin);
router.post('/login', loginLimiter, asyncHandler(c.login));
router.post('/logout', c.logout);
module.exports = router;
```
`/login` GET: if already logged in redirect `/`. Views `pages/setup.ejs` and `pages/login.ejs` always receive `error`/`errors` variables (pass `error: null`, `errors: []`, `username: ''` by default).

## Views
`views/pages/login.ejs`:
```html
<%- include('../partials/head', { title: 'Masuk' }) %>
<h1>Masuk</h1>
<form method="post" action="/login" class="card narrow">
  <%- include('../partials/csrf') %>
  <% if (error) { %><p class="flash flash-error"><%= error %></p><% } %>
  <label>Username <input name="username" required autofocus autocomplete="username"></label>
  <label>Password <input name="password" type="password" required autocomplete="current-password"></label>
  <button type="submit">Masuk</button>
</form>
<%- include('../partials/foot') %>
```
`views/pages/setup.ejs`: same style, title "Buat Akun Pertama", fields `username`, `password`, `confirm`, shows each item of `errors`, hint "Password minimal 10 karakter".

## Create src/routes/index.js (empty router for now)
```js
const router = require('express').Router();
router.get('/', (req, res) => res.render('pages/dashboard', { title: 'Dashboard' }));
module.exports = router;
```
and a minimal `views/pages/dashboard.ejs` (head include, `<h1>Dashboard</h1>`, foot include).

## Wire into src/app.js (order matters; replace the "Later tasks" comment)
```js
const { setupGuard, requireAuth } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errors');

app.use(require('./config/session'));
app.use(require('./middleware/csrf'));
app.use(require('./middleware/flash'));
app.use(setupGuard);
app.use(require('./routes/auth'));
app.use(requireAuth);
app.use(require('./routes'));
app.use(notFound);
app.use(errorHandler);
```
(`/health` and static files stay BEFORE the session line.)

## Done check
- [ ] Fresh DB: opening any URL redirects to `/setup`
- [ ] After creating the account, `/setup` redirects to `/login`
- [ ] Wrong password shows the generic error; 6th wrong attempt shows the "Terlalu banyak percobaan" message
- [ ] `/` without login redirects to `/login`; after login it shows the dashboard
- [ ] POST without CSRF token returns 403
- [ ] In `data/app.db`, `users.password_hash` starts with `$2`
