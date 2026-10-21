const authService = require('../services/authService');

function setupGuard(req, res, next) {
  const needs = authService.needsSetup();
  if (needs && req.path !== '/setup') return res.redirect('/setup');
  if (!needs && req.path === '/setup') return res.redirect('/login');
  next();
}

function requireAuth(req, res, next) {
  res.locals.isLoggedIn = Boolean(req.session.userId);
  if (!req.session.userId) return res.redirect('/login');
  next();
}

module.exports = { setupGuard, requireAuth };
