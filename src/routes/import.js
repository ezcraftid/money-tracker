const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { handleCsvUpload, handleDocUpload } = require('../middleware/upload');
const c = require('../controllers/importController');

router.get('/', c.show);
router.post('/upload', handleCsvUpload, asyncHandler(c.upload));
router.post('/ai', handleDocUpload, asyncHandler(c.aiUpload));
router.get('/:id', c.review);
router.post('/:id/commit', asyncHandler(c.commit));
router.post('/:id/discard', asyncHandler(c.discard));
module.exports = router;
