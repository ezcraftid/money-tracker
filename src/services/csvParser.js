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
