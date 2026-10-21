const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../utils/asyncHandler');
const c = require('../controllers/authController');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 5, skipSuccessfulRequests: true,
  handler: (req, res) => res.status(429).render('pages/login', { title: 'Masuk', error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' }),
});

router.get('/setup', c.showSetup);
router.post('/setup', asyncHandler(c.setup));
router.get('/login', c.showLogin);
router.post('/login', loginLimiter, asyncHandler(c.login));
router.post('/logout', c.logout);
module.exports = router;
