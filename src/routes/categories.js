const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const c = require('../controllers/categoryController');

router.get('/', c.show);
router.post('/', asyncHandler(c.create));
router.post('/:id', asyncHandler(c.update));
router.post('/:id/delete', asyncHandler(c.remove));
module.exports = router;
