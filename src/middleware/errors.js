function notFound(req, res) {
  res.status(404).render('pages/error', { title: 'Tidak ditemukan', message: 'Halaman tidak ditemukan.' });
}

function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);           // never log req.body
  if (res.headersSent) return next(err);
  res.status(err.status || 500).render('pages/error', {
    title: 'Terjadi kesalahan',
    message: err.expose ? err.message : 'Terjadi kesalahan pada server.',
  });
}

module.exports = { notFound, errorHandler };
