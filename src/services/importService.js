const db = require('../db');
const { ValidationError } = require('../utils/errors');
const { makeDedupeHash } = require('../utils/hash');
const { parseCsv } = require('./csvParser');
const importBatchRepository = require('../repositories/importBatchRepository');
const transactionRepository = require('../repositories/transactionRepository');
const accountRepository = require('../repositories/accountRepository');
const categoryRepository = require('../repositories/categoryRepository');

function buildPendingBatch({ source, filename, accountId, rows, warnings }) {
  const seen = new Map();
  for (const row of rows) {
    if (row.error) continue;
    const key = [accountId, row.date, row.type, row.amount, row.description.toLowerCase()].join('|');
    const occurrence = seen.get(key) || 0;
    seen.set(key, occurrence + 1);
    row.hash = makeDedupeHash({ accountId, ...row }, occurrence);
  }

  const payload = rows.map((row) => {
    const status = row.error
      ? 'invalid'
      : transactionRepository.existsByHash(row.hash) ? 'duplicate' : 'new';
    return {
      line: row.line,
      date: row.date || null,
      type: row.type || null,
      amount: row.amount || null,
      description: row.description || '',
      categoryId: null,
      hash: row.hash || null,
      status,
      error: row.error || null,
    };
  });

  return importBatchRepository.create({
    source,
    filename,
    accountId,
    payload: JSON.stringify(payload),
    warnings: JSON.stringify(warnings || []),
    rowsTotal: payload.length,
  });
}

function getReview(batchId) {
  const batch = importBatchRepository.findById(batchId);
  if (!batch) throw new ValidationError(['Impor tidak ditemukan.']);
  if (batch.status !== 'pending') throw new ValidationError(['Impor ini sudah selesai.']);
  return {
    batch,
    rows: batch.payload ? JSON.parse(batch.payload) : [],
    warnings: batch.warnings ? JSON.parse(batch.warnings) : [],
    categories: categoryRepository.list(),
  };
}

function commit(batchId, categoryChoices) {
  const review = getReview(batchId);
  const choices = categoryChoices || {};

  const run = db.transaction(() => {
    let rowsAdded = 0;
    let rowsSkipped = 0;
    for (const row of review.rows) {
      if (row.status !== 'new') { rowsSkipped += 1; continue; }
      if (transactionRepository.existsByHash(row.hash)) { rowsSkipped += 1; continue; }

      const cat = categoryRepository.findById(Number(choices[row.line]));
      const categoryId = cat && cat.kind === row.type ? cat.id : null;

      transactionRepository.create({
        accountId: review.batch.account_id,
        categoryId,
        type: row.type,
        amount: row.amount,
        date: row.date,
        description: row.description,
        source: review.batch.source,
        importBatchId: review.batch.id,
        dedupeHash: row.hash,
      });
      rowsAdded += 1;
    }
    importBatchRepository.markCommitted(batchId, { rowsAdded, rowsSkipped });
    return { added: rowsAdded, skipped: rowsSkipped };
  });

  return run();
}

function discard(batchId) {
  const review = getReview(batchId);
  importBatchRepository.markDiscarded(review.batch.id);
}

function uploadCsv({ accountId, file }) {
  if (!accountRepository.findById(accountId)) throw new ValidationError(['Pilih akun yang valid.']);
  if (!file || !file.buffer) throw new ValidationError(['File harus .csv, maksimal 2 MB.']);

  let rows;
  try {
    rows = parseCsv(file.buffer);
  } catch (err) {
    throw new ValidationError(['File CSV tidak bisa dibaca.']);
  }
  return buildPendingBatch({
    source: 'csv',
    filename: file.originalname,
    accountId,
    rows,
    warnings: [],
  });
}

module.exports = {
  buildPendingBatch,
  getReview,
  commit,
  discard,
  uploadCsv,
};
