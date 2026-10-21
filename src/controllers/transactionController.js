const transactionService = require('../services/transactionService');
const accountService = require('../services/accountService');
const categoryService = require('../services/categoryService');
const { toYMD } = require('../utils/date');
const { ValidationError } = require('../utils/errors');

function emptyForm() {
  return { date: toYMD(new Date()), type: 'expense', amount: '', accountId: '', categoryId: '', description: '' };
}

function renderForm(res, errors, form, title, action) {
  res.status(400).render('pages/transaction-form', {
    title,
    action,
    errors,
    form,
    accounts: accountService.list(),
    categories: categoryService.list(),
  });
}

exports.index = (req, res) => {
  const result = transactionService.list(req.query);
  res.render('pages/transactions', {
    title: 'Transaksi',
    transactions: result.items,
    total: result.total,
    page: result.page,
    pages: result.pages,
    query: req.query,
    accounts: accountService.list(),
    categories: categoryService.list(),
  });
};

exports.showNew = (req, res) => {
  res.render('pages/transaction-form', {
    title: 'Tambah Transaksi',
    action: '/transactions',
    errors: [],
    form: emptyForm(),
    accounts: accountService.list(),
    categories: categoryService.list(),
  });
};

exports.create = (req, res) => {
  try {
    transactionService.createManual(req.body);
    req.session.flash = { type: 'ok', text: 'Transaksi tersimpan.' };
    res.redirect('/transactions');
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    renderForm(res, err.errors, req.body, 'Tambah Transaksi', '/transactions');
  }
};

exports.showEdit = (req, res) => {
  const tx = transactionService.findById(req.params.id);
  if (!tx) {
    req.session.flash = { type: 'error', text: 'Transaksi tidak ditemukan.' };
    return res.redirect('/transactions');
  }
  res.render('pages/transaction-form', {
    title: 'Ubah Transaksi',
    action: '/transactions/' + tx.id,
    errors: [],
    form: {
      date: tx.date,
      type: tx.type,
      amount: tx.amount,
      accountId: tx.account_id,
      categoryId: tx.category_id || '',
      description: tx.description,
    },
    accounts: accountService.list(),
    categories: categoryService.list(),
  });
};

exports.update = (req, res) => {
  try {
    transactionService.update(req.params.id, req.body);
    req.session.flash = { type: 'ok', text: 'Transaksi diperbarui.' };
    res.redirect('/transactions');
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    renderForm(res, err.errors, req.body, 'Ubah Transaksi', '/transactions/' + req.params.id);
  }
};

exports.remove = (req, res) => {
  try {
    transactionService.remove(req.params.id);
    req.session.flash = { type: 'ok', text: 'Transaksi dihapus.' };
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    req.session.flash = { type: 'error', text: err.errors.join(' ') };
  }
  res.redirect('/transactions');
};
