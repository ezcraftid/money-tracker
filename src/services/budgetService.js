const budgetRepository = require('../repositories/budgetRepository');
const categoryRepository = require('../repositories/categoryRepository');
const report = require('../repositories/reportRepository');
const { parseAmount } = require('../utils/parse');
const { monthRange } = require('../utils/date');
const { ValidationError } = require('../utils/errors');

// Every expense category is listed, with its budget (if any) and this month's usage.
function list(date = new Date()) {
  const { from, to } = monthRange(date);
  const usage = new Map(report.budgetUsage(from, to).map(r => [r.category_id, r]));
  return categoryRepository.list('expense').map(c => {
    const used = usage.get(c.id);
    const limit = used ? used.monthly_limit : null;
    const spent = used ? used.spent : 0;
    return {
      id: c.id,
      name: c.name,
      monthly_limit: limit,
      spent,
      percent: limit ? Math.round((spent / limit) * 100) : null,
    };
  });
}

// Empty or 0 removes the budget. Invalid input throws a ValidationError.
function setLimit(categoryId, rawValue) {
  const category = categoryRepository.findById(Number(categoryId));
  if (!category) throw new ValidationError(['Kategori tidak ditemukan.']);
  if (category.kind !== 'expense') throw new ValidationError(['Anggaran hanya untuk kategori pengeluaran.']);

  const raw = String(rawValue ?? '').trim();
  if (raw === '') {
    budgetRepository.remove(category.id);
    return { removed: true };
  }

  const amount = parseAmount(raw);
  if (amount === null || amount < 0 || !Number.isInteger(amount)) {
    throw new ValidationError(['Batas harus angka bulat.']);
  }
  if (amount === 0) {
    budgetRepository.remove(category.id);
    return { removed: true };
  }
  budgetRepository.upsert(category.id, amount);
  return { removed: false };
}

module.exports = { list, setLimit };
