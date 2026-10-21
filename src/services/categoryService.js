const categoryRepository = require('../repositories/categoryRepository');
const { ValidationError } = require('../utils/errors');

const KINDS = ['income', 'expense'];
const KIND_LABELS = { income: 'Pemasukan', expense: 'Pengeluaran' };

const list = (kind) => categoryRepository.list(kind);
const findById = (id) => categoryRepository.findById(id);
const kindLabel = (kind) => KIND_LABELS[kind] || kind;

function validate(input, { requireKind = true } = {}) {
  const errors = [];
  const name = String(input.name || '').trim();
  if (!name) errors.push('Nama kategori wajib diisi.');
  else if (name.length > 60) errors.push('Nama kategori maksimal 60 karakter.');

  let kind = null;
  if (requireKind) {
    kind = String(input.kind || '');
    if (!KINDS.includes(kind)) errors.push('Jenis kategori harus pemasukan atau pengeluaran.');
  }
  if (errors.length) throw new ValidationError(errors);
  return { name, kind };
}

function translateUnique(err) {
  if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    throw new ValidationError(['Kategori dengan nama dan jenis yang sama sudah ada.']);
  }
  throw err;
}

function create(input) {
  const clean = validate(input);
  try {
    return categoryRepository.create(clean);
  } catch (err) {
    translateUnique(err);
  }
}

function update(id, input) {
  if (!categoryRepository.findById(id)) throw new ValidationError(['Kategori tidak ditemukan.']);
  const clean = validate(input, { requireKind: false });
  try {
    return categoryRepository.update(id, clean);
  } catch (err) {
    translateUnique(err);
  }
}

function remove(id) {
  if (!categoryRepository.findById(id)) throw new ValidationError(['Kategori tidak ditemukan.']);
  if (categoryRepository.countUsage(id) > 0) {
    throw new ValidationError(['Kategori masih dipakai transaksi atau anggaran. Hapus pemakaiannya dulu.']);
  }
  return categoryRepository.remove(id);
}

module.exports = { list, findById, create, update, remove, kindLabel };
