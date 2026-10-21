const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const c = require('../controllers/budgetController');

router.get('/', c.show);
router.post('/:categoryId', asyncHandler(c.save));
module.exports = router;
