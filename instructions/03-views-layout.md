# TASK 03 — Layout, CSS, errors, helpers

## Utilities (write exactly)

### src/utils/date.js
```js
const pad = (n) => String(n).padStart(2, '0');
const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function monthRange(d = new Date()) {
  return {
    from: toYMD(new Date(d.getFullYear(), d.getMonth(), 1)),
    to: toYMD(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  };
}

// Week runs Monday..Sunday
function weekRange(d = new Date()) {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const start = new Date(day);
  start.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: toYMD(start), to: toYMD(end) };
}

function shiftDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

module.exports = { toYMD, monthRange, weekRange, shiftDays };
```

### src/utils/format.js
```js
const nf = new Intl.NumberFormat('id-ID');
const rupiah = (n) => 'Rp ' + nf.format(n);
const dateID = (ymd) => { const [y, m, d] = ymd.split('-'); return `${d}/${m}/${y}`; };
module.exports = { rupiah, dateID };
```

### src/utils/asyncHandler.js
```js
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
```

### src/utils/errors.js
```js
class ValidationError extends Error {
  constructor(errors) {
    super(errors.join('; '));
    this.errors = errors;   // array of Indonesian messages
    this.status = 400;
    this.expose = true;
  }
}
module.exports = { ValidationError };
```

## Middleware (write exactly)

### src/middleware/flash.js
```js
module.exports = (req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
};
```
Usage in controllers: `req.session.flash = { type: 'ok', text: 'Tersimpan.' }` (type is `ok` or `error`).

### src/middleware/errors.js
```js
function notFound(req, res) {
  res.status(404).render('pages/error', { title: 'Tidak ditemukan', message: 'Halaman tidak ditemukan.' });
}

function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);           // never log req.body
  if (res.headersSent) return next(err);
  res.status(err.status || 500).render('pages/error', {
    title: 'Terjadi kesalahan',
    message: err.expose ? err.message : 'Terjadi kesalahan pada server.',
  });
}

module.exports = { notFound, errorHandler };
```

In `src/app.js` add (right after `express.static`): `app.locals.rupiah = require('./utils/format').rupiah; app.locals.dateID = require('./utils/format').dateID;`

## Views

### views/partials/head.ejs
```html
<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><%= title %> - Money Tracker</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<% if (locals.isLoggedIn) { %><%- include('nav') %><% } %>
<main class="container">
<%- include('flash') %>
```

### views/partials/foot.ejs
```html
</main>
</body>
</html>
```

### views/partials/flash.ejs
```html
<% if (locals.flash) { %>
  <p class="flash flash-<%= flash.type %>"><%= flash.text %></p>
<% } %>
```

### views/partials/csrf.ejs
```html
<input type="hidden" name="_csrf" value="<%= locals.csrfToken || '' %>">
```

### views/partials/nav.ejs
```html
<nav class="nav">
  <a href="/">Dashboard</a>
  <a href="/transactions">Transaksi</a>
  <a href="/accounts">Akun</a>
  <a href="/categories">Kategori</a>
  <a href="/budgets">Anggaran</a>
  <a href="/import">Impor</a>
  <form method="post" action="/logout" class="nav-logout">
    <%- include('csrf') %>
    <button type="submit" class="link-button">Keluar</button>
  </form>
</nav>
```

### views/pages/error.ejs
```html
<%- include('../partials/head', { title }) %>
<h1><%= title %></h1>
<p><%= message %></p>
<p><a href="/">Kembali ke dashboard</a></p>
<%- include('../partials/foot') %>
```

## public/css/style.css (write exactly, then extend only with plain flat rules)
```css
:root {
  --bg: #f6f6f4; --surface: #ffffff; --text: #1a1a1a; --muted: #666666;
  --border: #d8d8d2; --accent: #2f6f4f; --danger: #a33a3a; --warn: #8a6a1f;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height: 1.5; }
.container { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
h1 { font-size: 1.4rem; margin: 0 0 16px; }
h2 { font-size: 1.1rem; margin: 24px 0 8px; }
a { color: var(--accent); }
.nav { display: flex; gap: 16px; flex-wrap: wrap; padding: 12px 16px;
  background: var(--surface); border-bottom: 1px solid var(--border); }
.nav a { text-decoration: none; color: var(--text); }
.nav-logout { margin-left: auto; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 4px; padding: 16px; margin-bottom: 16px; }
.narrow { max-width: 360px; }
label { display: block; margin-bottom: 12px; font-size: .9rem; }
input, select, textarea { display: block; width: 100%; margin-top: 4px; padding: 8px;
  border: 1px solid var(--border); border-radius: 4px; font: inherit; background: #fff; }
button, .button { padding: 8px 14px; border: 1px solid var(--accent); border-radius: 4px;
  background: var(--accent); color: #fff; font: inherit; cursor: pointer; text-decoration: none; display: inline-block; }
button.secondary, .button.secondary { background: #fff; color: var(--accent); }
button.danger { background: #fff; color: var(--danger); border-color: var(--danger); }
.link-button { background: none; border: none; color: var(--text); padding: 0; }
table { width: 100%; border-collapse: collapse; background: var(--surface); border: 1px solid var(--border); }
th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--border); font-size: .9rem; }
th { background: #efefea; font-weight: 600; }
.num { text-align: right; white-space: nowrap; }
.muted { color: var(--muted); }
.flash { padding: 8px 12px; border: 1px solid var(--border); border-radius: 4px; background: var(--surface); }
.flash-ok { border-color: var(--accent); }
.flash-error { border-color: var(--danger); color: var(--danger); }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.stat-label { font-size: .8rem; color: var(--muted); }
.stat-value { font-size: 1.3rem; font-weight: 600; }
.alert-warn { border-left: 3px solid var(--warn); padding-left: 8px; }
.alert-over { border-left: 3px solid var(--danger); padding-left: 8px; }
.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: end; }
@media (max-width: 600px) { .container { padding: 16px 12px; } }
```
(No gradients, no box-shadow, no transitions, no animations.)

## Done check
- [ ] All files above exist with the exact paths
- [ ] `css/style.css` has no `gradient`, `box-shadow`, `animation`, `transition`
- [ ] App still starts
