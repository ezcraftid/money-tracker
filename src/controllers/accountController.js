const accountService = require('../services/accountService');
const { ValidationError } = require('../utils/errors');

function renderForm(res, errors, form) {
  res.status(400).render('pages/accounts', {
    title: 'Akun',
    accounts: accountService.list(),
    errors,
    form,
  });
}

exports.show = (req, res) => {
  res.render('pages/accounts', {
    title: 'Akun',
    accounts: accountService.list(),
    errors: [],
    form: {},
  });
};

exports.create = (req, res) => {
  try {
    accountService.create(req.body);
    req.session.flash = { type: 'ok', text: 'Akun tersimpan.' };
    res.redirect('/accounts');
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    renderForm(res, err.errors, req.body);
  }
};

exports.update = (req, res) => {
  try {
    accountService.update(req.params.id, req.body);
    req.session.flash = { type: 'ok', text: 'Akun diperbarui.' };
    res.redirect('/accounts');
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    renderForm(res, err.errors, req.body);
  }
};

exports.remove = (req, res) => {
  try {
    accountService.remove(req.params.id);
    req.session.flash = { type: 'ok', text: 'Akun dihapus.' };
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    req.session.flash = { type: 'error', text: err.errors.join(' ') };
  }
  res.redirect('/accounts');
};
