# TASK 05 — Accounts, categories, manual transactions

## Pages and routes (all behind login)
| Method | URL | Purpose |
|---|---|---|
| GET | /accounts | list + add form |
| POST | /accounts | create |
| POST | /accounts/:id | update |
| POST | /accounts/:id/delete | delete (refuse if it has transactions) |
| GET | /categories | list (income and expense) + add form |
| POST | /categories, /categories/:id, /categories/:id/delete | same pattern (refuse delete if `countUsage > 0`) |
| GET | /transactions | list, filters `month` (YYYY-MM), `account`, `category`, `page` (50 per page) |
| GET | /transactions/new | form |
| POST | /transactions | create |
| GET | /transactions/:id/edit | form |
| POST | /transactions/:id | update |
| POST | /transactions/:id/delete | delete |

Create: `routes/accounts.js`, `routes/categories.js`, `routes/transactions.js`, matching controllers, services (`accountService`, `categoryService`, `transactionService`) and views. Mount all in `src/routes/index.js`.

## Validation lives in services
`src/utils/parse.js` (create now, extended in task 07):
```js
// "15.000", "Rp 15.000", "15000" -> 15000. Returns null when invalid.
function parseAmount(raw) {
  const str = String(raw ?? '').trim();
  const negative = str.startsWith('-') || str.startsWith('(');
  let s = str.replace(/[^\d.,]/g, '');
  s = s.replace(/[.,]\d{1,2}$/, '');   // drop decimals like ",00" (rupiah has none)
  s = s.replace(/[.,]/g, '');          // drop thousand separators
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? (negative ? -n : n) : null;
}
module.exports = { parseAmount };
```

`src/services/transactionService.js` (pattern to follow):
```js
const crypto = require('crypto');
const transactionRepository = require('../repositories/transactionRepository');
const accountRepository = require('../repositories/accountRepository');
const categoryRepository = require('../repositories/categoryRepository');
const { parseAmount } = require('../utils/parse');
const { ValidationError } = require('../utils/errors');

function validate(input) {
  const errors = [];
  const amount = parseAmount(input.amount);
  if (!Number.isInteger(amount) || amount <= 0) errors.push('Jumlah harus angka bulat lebih dari 0.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date || '') || Number.isNaN(Date.parse(input.date))) errors.push('Tanggal tidak valid.');
  if (!['income', 'expense'].includes(input.type)) errors.push('Jenis harus pemasukan atau pengeluaran.');
  const accountId = Number(input.accountId);
  if (!accountRepository.findById(accountId)) errors.push('Akun tidak ditemukan.');
  let categoryId = null;
  if (input.categoryId) {
    const cat = categoryRepository.findById(Number(input.categoryId));
    if (!cat || cat.kind !== input.type) errors.push('Kategori tidak cocok dengan jenis transaksi.');
    else categoryId = cat.id;
  }
  const description = String(input.description || '').trim().slice(0, 200);
  if (errors.length) throw new ValidationError(errors);
  return { accountId, categoryId, type: input.type, amount, date: input.date, description };
}

function createManual(input) {
  const clean = validate(input);
  return transactionRepository.create({ ...clean, source: 'manual', dedupeHash: 'manual:' + crypto.randomUUID() });
}

function update(id, input) {
  if (!transactionRepository.findById(id)) throw new ValidationError(['Transaksi tidak ditemukan.']);
  transactionRepository.update(id, validate(input));
}

module.exports = { createManual, update, validate /* + list(filters, page), remove(id) */ };
```

## Controller pattern (re-render form on validation error, keep what the user typed)
```js
exports.create = (req, res) => {
  try {
    transactionService.createManual(req.body);
    req.session.flash = { type: 'ok', text: 'Transaksi tersimpan.' };
    res.redirect('/transactions');
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    res.status(400).render('pages/transaction-form', {
      title: 'Tambah Transaksi', errors: err.errors, form: req.body,
      accounts: accountService.list(), categories: categoryService.list(),
    });
  }
};
```
Every form page receives `errors` (array) and `form` (object) even when empty.

## UI notes
- Transaction form fields: date (default today via `toYMD(new Date())`), type (radio), amount, account, category (select; the category options must be filtered by type with a tiny script in `public/js/transaction-form.js`), description.
- List table columns: Tanggal, Deskripsi, Kategori, Akun, Jumlah (right aligned; expenses prefixed with "-"), Aksi.
- Delete buttons are small POST forms with the CSRF partial. No JavaScript `confirm()` inline; use `public/js/confirm-delete.js` that adds a confirm dialog to forms with `data-confirm="..."`.
- Add one default account on first visit to /accounts only if there are none? NO. Show the text "Belum ada akun. Tambahkan dulu." instead.

## Done check
- [ ] Can create an account and a category, then a transaction
- [ ] Amount "15.000" is saved as 15000
- [ ] Income transaction with an expense category is rejected with a message
- [ ] Deleting an account that has transactions is refused with a message
- [ ] Editing a transaction works; filters by month and account work
- [ ] No SQL in controllers; no `req`/`res` in services
