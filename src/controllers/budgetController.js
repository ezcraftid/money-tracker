const budgetService = require('../services/budgetService');
const { ValidationError } = require('../utils/errors');

exports.show = (req, res) => {
  res.render('pages/budgets', {
    title: 'Anggaran',
    budgets: budgetService.list(),
  });
};

exports.save = (req, res) => {
  try {
    const result = budgetService.setLimit(req.params.categoryId, req.body.monthlyLimit);
    req.session.flash = {
      type: 'ok',
      text: result.removed ? 'Anggaran dihapus.' : 'Anggaran tersimpan.',
    };
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    req.session.flash = { type: 'error', text: err.errors.join(' ') };
  }
  res.redirect('/budgets');
};
