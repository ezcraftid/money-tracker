const multer = require('multer');
const path = require('path');

const csvUpload = multer({
  storage: multer.memoryStorage(),           // never write uploads to disk
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, path.extname(file.originalname).toLowerCase() === '.csv'),
}).single('file');

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, ['.png', '.jpg', '.jpeg', '.webp', '.pdf'].includes(path.extname(file.originalname).toLowerCase())),
}).single('file');

// Wraps multer so that a missing/rejected file or an oversized upload flashes a
// friendly message instead of crashing with a MulterError.
function handleCsvUpload(req, res, next) {
  csvUpload(req, res, (err) => {
    if (err || !req.file) {
      req.session.flash = { type: 'error', text: 'File harus .csv, maksimal 2 MB.' };
      return res.redirect('/import');
    }
    return next();
  });
}

function handleDocUpload(req, res, next) {
  docUpload(req, res, (err) => {
    if (err || !req.file) {
      req.session.flash = { type: 'error', text: 'File harus .png, .jpg, .webp, atau .pdf, maksimal 5 MB.' };
      return res.redirect('/import');
    }
    return next();
  });
}

module.exports = { csvUpload, docUpload, handleCsvUpload, handleDocUpload };
