const authService = require('../services/authService');
const { ValidationError } = require('../utils/errors');

exports.showSetup = (req, res) => {
  res.render('pages/setup', {
    title: 'Buat Akun Pertama',
    error: null,
    errors: [],
    username: '',
  });
};

exports.setup = async (req, res, next) => {
  try {
    await authService.createFirstUser(req.body.username, req.body.password, req.body.confirm);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).render('pages/setup', {
        title: 'Buat Akun Pertama',
        error: null,
        errors: err.errors,
        username: String(req.body.username || ''),
      });
    }
    return next(err);
  }
  req.session.flash = { type: 'ok', text: 'Akun dibuat. Silakan masuk.' };
  res.redirect('/login');
};

exports.showLogin = (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('pages/login', { title: 'Masuk', error: null, errors: [], username: '' });
};

exports.login = async (req, res, next) => {
  const user = await authService.verifyLogin(req.body.username, req.body.password);
  if (!user) {
    return res.status(401).render('pages/login', { title: 'Masuk', error: 'Username atau password salah.' });
  }
  // regenerate session id to prevent session fixation
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = user.id;
    req.session.save((err2) => (err2 ? next(err2) : res.redirect('/')));
  });
};

exports.logout = (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
};
