const importService = require('../services/importService');
const extractionService = require('../services/extractionService');
const { AiUnavailableError } = require('../services/aiClient');
const importBatchRepository = require('../repositories/importBatchRepository');
const accountService = require('../services/accountService');
const { ValidationError } = require('../utils/errors');

function flashError(req, errors) {
  req.session.flash = { type: 'error', text: errors.join(' ') };
}

exports.show = (req, res) => {
  res.render('pages/import', {
    title: 'Impor',
    batches: importBatchRepository.listRecent(10),
    accounts: accountService.list(),
  });
};

exports.upload = (req, res) => {
  try {
    const batchId = importService.uploadCsv({
      accountId: Number(req.body.accountId),
      file: req.file,
    });
    res.redirect('/import/' + batchId);
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    flashError(req, err.errors);
    res.redirect('/import');
  }
};

exports.aiUpload = async (req, res) => {
  try {
    const accountId = Number(req.body.accountId);
    if (!accountService.findById(accountId)) throw new ValidationError(['Pilih akun yang valid.']);
    if (!req.file || !req.file.buffer) {
      throw new ValidationError(['File harus .png, .jpg, .webp, atau .pdf, maksimal 5 MB.']);
    }
    const options = { filename: req.file.originalname, accountId };
    const batchId = extractionService.isPdf(req.file.buffer)
      ? await extractionService.extractFromPdf(req.file.buffer, options)
      : await extractionService.extractFromImage(req.file.buffer, options);
    res.redirect('/import/' + batchId);
  } catch (err) {
    if (!(err instanceof ValidationError) && !(err instanceof AiUnavailableError)) throw err;
    req.session.flash = { type: 'error', text: err.message };
    res.redirect('/import');
  }
};

exports.review = (req, res) => {
  let data;
  try {
    data = importService.getReview(req.params.id);
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    flashError(req, err.errors);
    return res.redirect('/import');
  }
  res.render('pages/import-review', {
    title: 'Tinjau Impor',
    batch: data.batch,
    rows: data.rows,
    warnings: data.warnings,
    categories: data.categories,
  });
};

exports.commit = (req, res) => {
  let data;
  try {
    data = importService.getReview(req.params.id);
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    flashError(req, err.errors);
    return res.redirect('/import');
  }

  const choices = {};
  for (const row of data.rows) {
    if (row.status === 'new') {
      const value = req.body['cat_' + row.line];
      if (value) choices[row.line] = Number(value);
    }
  }

  try {
    const result = importService.commit(req.params.id, choices);
    req.session.flash = {
      type: 'ok',
      text: `Impor selesai: ${result.added} transaksi disimpan, ${result.skipped} baris dilewati.`,
    };
    res.redirect('/import');
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    flashError(req, err.errors);
    res.redirect('/import');
  }
};

exports.discard = (req, res) => {
  try {
    importService.discard(req.params.id);
    req.session.flash = { type: 'ok', text: 'Impor dibuang.' };
  } catch (err) {
    if (!(err instanceof ValidationError)) throw err;
    flashError(req, err.errors);
  }
  res.redirect('/import');
};
