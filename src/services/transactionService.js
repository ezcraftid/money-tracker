const crypto = require('crypto');
const transactionRepository = require('../repositories/transactionRepository');
const accountRepository = require('../repositories/accountRepository');
const categoryRepository = require('../repositories/categoryRepository');
const { parseAmount } = require('../utils/parse');
const { toYMD } = require('../utils/date');
const { ValidationError } = require('../utils/errors');

const PER_PAGE = 50;

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

const findById = (id) => transactionRepository.findById(id);

// Builds SQL filters from raw query parameters. Only bound values are used later.
function buildFilters(query = {}) {
  const filters = {};
  const month = String(query.month || '').trim();
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (m) {
    const year = Number(m[1]);
    const mon = Number(m[2]);
    if (mon >= 1 && mon <= 12) {
      filters.from = toYMD(new Date(year, mon - 1, 1));
      filters.to = toYMD(new Date(year, mon, 0));
    }
  }
  const accountId = Number(query.account);
  if (Number.isInteger(accountId) && accountId > 0) filters.accountId = accountId;
  const categoryId = Number(query.category);
  if (Number.isInteger(categoryId) && categoryId > 0) filters.categoryId = categoryId;
  return filters;
}

function list(query = {}) {
  const filters = buildFilters(query);
  const page = Math.max(1, Number(query.page) || 1);
  const total = transactionRepository.count(filters);
  const items = transactionRepository.list(filters, PER_PAGE, (page - 1) * PER_PAGE);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  return { items, total, page, pages, perPage: PER_PAGE, filters };
}

function remove(id) {
  if (!transactionRepository.findById(id)) throw new ValidationError(['Transaksi tidak ditemukan.']);
  return transactionRepository.remove(id);
}

module.exports = { createManual, update, findById, buildFilters, list, remove, validate };
