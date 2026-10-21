# TASK 07 — Import (CSV) with duplicate detection and review screen

## Flow (same for CSV in this task and AI in task 08)
1. User picks an account + file at `/import` -> POST `/import/upload?_csrf=...`
2. Server parses rows, validates each, marks duplicates, saves a PENDING batch (rows as JSON in `import_batches.payload`).
3. Redirect to `/import/:id` = REVIEW SCREEN: table of rows with status (Baru / Duplikat / Tidak valid), editable category per new row.
4. POST `/import/:id/commit` inserts only rows with status "new" in ONE database transaction. POST `/import/:id/discard` throws it away.
Nothing is written to `transactions` before the user presses commit.

## src/utils/hash.js
```js
const crypto = require('crypto');

// `occurrence` = n-th identical row inside the same document (0, 1, 2...).
// This keeps two real purchases of the same amount on the same day from being treated as duplicates,
// while re-importing the same document still matches row by row.
function makeDedupeHash({ accountId, date, type, amount, description }, occurrence = 0) {
  const norm = String(description).toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update([accountId, date, type, amount, norm, occurrence].join('|')).digest('hex');
}
module.exports = { makeDedupeHash };
```

## Extend src/utils/parse.js with parseDate
```js
// Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY. Returns 'YYYY-MM-DD' or null.
function parseDate(raw) {
  const s = String(raw ?? '').trim();
  let m;
  let y; let mo; let d;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
module.exports = { parseAmount, parseDate };
```

## src/services/csvParser.js
Input: a Buffer. Output: array of `{ line, date, description, amount (positive int), type }` plus `errors` per bad row.
```js
const { parse } = require('csv-parse/sync');
const { parseAmount, parseDate } = require('../utils/parse');

const ALIASES = {
  date: ['date', 'tanggal'],
  description: ['description', 'keterangan', 'deskripsi'],
  amount: ['amount', 'jumlah', 'nominal'],
  type: ['type', 'tipe', 'jenis'],
};
const EXPENSE_WORDS = ['expense', 'keluar', 'debit', 'db', 'pengeluaran'];
const INCOME_WORDS = ['income', 'masuk', 'kredit', 'cr', 'pemasukan'];
const MAX_ROWS = 2000;

function pick(record, key) {
  for (const alias of ALIASES[key]) if (record[alias] !== undefined) return record[alias];
  return undefined;
}

function parseCsv(buffer) {
  const records = parse(buffer, {
    columns: (headers) => headers.map(h => String(h).trim().toLowerCase()),
    skip_empty_lines: true, bom: true, relax_column_count: true, delimiter: [',', ';'],
  });
  if (records.length > MAX_ROWS) throw new Error(`Maksimal ${MAX_ROWS} baris per file.`);

  return records.map((rec, i) => {
    const row = { line: i + 2, error: null };
    const date = parseDate(pick(rec, 'date'));
    const rawAmount = parseAmount(pick(rec, 'amount'));
    const typeWord = String(pick(rec, 'type') ?? '').trim().toLowerCase();
    let type = EXPENSE_WORDS.includes(typeWord) ? 'expense' : INCOME_WORDS.includes(typeWord) ? 'income' : null;
    if (!type && rawAmount !== null) type = rawAmount < 0 ? 'expense' : 'income'; // no type column: sign decides
    const amount = rawAmount === null ? null : Math.abs(rawAmount);

    if (!date) row.error = 'Tanggal tidak valid';
    else if (!amount) row.error = 'Jumlah tidak valid';
    else if (!type) row.error = 'Jenis tidak diketahui';
    return { ...row, date, amount, type, description: String(pick(rec, 'description') ?? '').trim().slice(0, 200) };
  });
}
module.exports = { parseCsv };
```
Required CSV headers: `date`/`tanggal`, `amount`/`jumlah`, `description`/`keterangan`; optional `type`. Separate debit/kredit columns are NOT supported; say so on the page.

## src/services/importService.js (shared by CSV and AI)
Export these functions:
- `buildPendingBatch({ source, filename, accountId, rows, warnings })`
  - For each row: if `row.error` -> `status: 'invalid'`. Otherwise compute the hash with occurrence counting, then `status: transactionRepository.existsByHash(hash) ? 'duplicate' : 'new'`.
  - Row shape stored in payload: `{ line, date, type, amount, description, categoryId: null, hash, status, error }`.
  - Creates the batch via `importBatchRepository.create(...)` and returns the batch id.
```js
// occurrence counting (inside buildPendingBatch)
const seen = new Map();
for (const row of rows) {
  if (row.error) continue;
  const key = [accountId, row.date, row.type, row.amount, row.description.toLowerCase()].join('|');
  const occurrence = seen.get(key) || 0;
  seen.set(key, occurrence + 1);
  row.hash = makeDedupeHash({ accountId, ...row }, occurrence);
}
```
- `getReview(batchId)`: batch + parsed payload + category lists. Throws if status is not `pending`.
- `commit(batchId, categoryChoices)`: `categoryChoices` = object `{ [line]: categoryId }`. In ONE `db.transaction`: for every row with status `new`, re-check `existsByHash` (race safety), validate category kind matches type (else null), insert with `source = batch.source` and `import_batch_id`. Then `markCommitted(id, { rowsAdded, rowsSkipped })`.
- `discard(batchId)`.
- `uploadCsv({ accountId, file })`: validates account exists, file present, calls `parseCsv`, then `buildPendingBatch`. Parse errors (`Error` from csv-parse) -> `ValidationError(['File CSV tidak bisa dibaca.'])`.

## src/middleware/upload.js
```js
const multer = require('multer');
const path = require('path');

const csvUpload = multer({
  storage: multer.memoryStorage(),           // never write uploads to disk
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, path.extname(file.originalname).toLowerCase() === '.csv'),
}).single('file');

module.exports = { csvUpload };
```
If `req.file` is missing after upload, show "File harus .csv, maksimal 2 MB."

## Routes / views
- `GET /import` -> `pages/import.ejs`: form (account select, file input, `enctype="multipart/form-data"`, action includes `?_csrf=<%= csrfToken %>`), a short note about CSV columns, and a list of the 10 most recent batches (source, filename, status, added/skipped).
- `GET /import/:id` -> `pages/import-review.ejs` (generic, used by task 08 too): warnings list on top, table with columns Baris, Tanggal, Deskripsi, Jumlah, Jenis, Status, Kategori. Category `<select name="cat_<line>">` only for `new` rows, options filtered by row type. Buttons: "Simpan yang baru" (commit) and "Buang" (discard).
- Controller reads `req.body['cat_' + line]` for each row line to build `categoryChoices`.
- Mount at `/import` in `routes/index.js`.

## Done check
- [ ] Uploading a 5-row CSV shows a review screen; nothing is in `transactions` yet
- [ ] Commit inserts the rows; uploading the SAME file again shows all rows as "Duplikat"
- [ ] Two identical rows in one file (same day, same amount) are both imported as new the first time
- [ ] A row with a bad date shows "Tidak valid" and is not imported
- [ ] A non-CSV or file over 2 MB is rejected with a message
- [ ] Commit runs in one DB transaction
