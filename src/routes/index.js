const router = require('express').Router();

router.use('/accounts', require('./accounts'));
router.use('/categories', require('./categories'));
router.use('/transactions', require('./transactions'));
router.use('/budgets', require('./budgets'));
router.use('/import', require('./import'));

router.get('/', require('../controllers/dashboardController').index);
router.post('/dashboard/ai-tips', require('../utils/asyncHandler')(require('../controllers/dashboardController').aiTips));
module.exports = router;
