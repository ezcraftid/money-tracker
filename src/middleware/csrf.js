const crypto = require('crypto');

module.exports = function csrf(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  // Token may come from body, query string (multipart uploads), or header.
  const sent = String((req.body && req.body._csrf) || req.query._csrf || req.get('x-csrf-token') || '');
  const a = Buffer.from(sent);
  const b = Buffer.from(req.session.csrfToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(403).render('pages/error', { title: 'Ditolak', message: 'Sesi tidak valid. Muat ulang halaman lalu coba lagi.' });
  }
  next();
};
