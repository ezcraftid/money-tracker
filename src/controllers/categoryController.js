const categoryService = require('../services/categoryService');
const { ValidationError } = require('../utils/errors');

function renderForm(res, errors, form) {
  res.status(400).render('pages/categories', {
    title: 'Kategori',
    categories: categoryService.list(),
    errors,
    form,
  });
}

exports.show = (req, res) => {
  res.render('pages/categories', {
    title: 'Kategori',
    categories: categoryService.list(),
    errors: [],
    form: {},
  });
};

exports.create = (req, res) => {
  try {
    categoryService.create(req.body);
    req.session.flash = { type: 'ok', text: 'Kategori tersimpan.' };
    res.redirect('/categories');
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    renderForm(res, err.errors, req.body);
  }
};

exports.update = (req, res) => {
  try {
    categoryService.update(req.params.id, req.body);
    req.session.flash = { type: 'ok', text: 'Kategori diperbarui.' };
    res.redirect('/categories');
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    renderForm(res, err.errors, req.body);
  }
};

exports.remove = (req, res) => {
  try {
    categoryService.remove(req.params.id);
    req.session.flash = { type: 'ok', text: 'Kategori dihapus.' };
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    req.session.flash = { type: 'error', text: err.errors.join(' ') };
  }
  res.redirect('/categories');
};
