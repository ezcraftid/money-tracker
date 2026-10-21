const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const c = require('../controllers/transactionController');

router.get('/', c.index);
router.get('/new', c.showNew);
router.post('/', asyncHandler(c.create));
router.get('/:id/edit', c.showEdit);
router.post('/:id', asyncHandler(c.update));
router.post('/:id/delete', asyncHandler(c.remove));
module.exports = router;
