const accountRepository = require('../repositories/accountRepository');
const { parseAmount } = require('../utils/parse');
const { ValidationError } = require('../utils/errors');

const TYPES = ['cash', 'bank', 'ewallet'];
const TYPE_LABELS = { cash: 'Tunai', bank: 'Bank', ewallet: 'E-Wallet' };

const list = () => accountRepository.list();
const findById = (id) => accountRepository.findById(id);
const typeLabel = (type) => TYPE_LABELS[type] || type;

function validate(input) {
  const errors = [];
  const name = String(input.name || '').trim();
  if (!name) errors.push('Nama akun wajib diisi.');
  else if (name.length > 60) errors.push('Nama akun maksimal 60 karakter.');

  const type = String(input.type || '');
  if (!TYPES.includes(type)) errors.push('Jenis akun harus tunai, bank, atau ewallet.');

  const rawBalance = String(input.initialBalance ?? '').trim();
  const balance = rawBalance === '' ? 0 : parseAmount(rawBalance);
  if (balance === null) errors.push('Saldo awal harus angka.');

  if (errors.length) throw new ValidationError(errors);
  return { name, type, initialBalance: balance };
}

function translateUnique(err) {
  if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    throw new ValidationError(['Nama akun sudah dipakai.']);
  }
  throw err;
}

function create(input) {
  const clean = validate(input);
  try {
    return accountRepository.create(clean);
  } catch (err) {
    translateUnique(err);
  }
}

function update(id, input) {
  if (!accountRepository.findById(id)) throw new ValidationError(['Akun tidak ditemukan.']);
  const clean = validate(input);
  try {
    return accountRepository.update(id, clean);
  } catch (err) {
    translateUnique(err);
  }
}

function remove(id) {
  if (!accountRepository.findById(id)) throw new ValidationError(['Akun tidak ditemukan.']);
  if (accountRepository.countTransactions(id) > 0) {
    throw new ValidationError(['Akun masih memiliki transaksi. Hapus transaksinya dulu.']);
  }
  return accountRepository.remove(id);
}

module.exports = { list, findById, create, update, remove, typeLabel };
