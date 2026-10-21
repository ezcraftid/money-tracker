const dashboardService = require('../services/dashboardService');
const budgetService = require('../services/budgetService');
const { chatWithFallback } = require('../services/aiClient');

exports.index = (req, res) => {
  res.render('pages/dashboard', Object.assign({ title: 'Dashboard' }, dashboardService.getDashboard()));
};

exports.aiTips = async (req, res) => {
  const data = dashboardService.getDashboard();
  const payload = {
    minggu_ini: data.thisWeek.byCategory,
    minggu_lalu: data.lastWeek.byCategory,
    anggaran: budgetService.list().map(b => ({ kategori: b.name, batas: b.monthly_limit, terpakai: b.spent })),
  };

  try {
    const { text } = await chatWithFallback([
      { role: 'system', content: 'Kamu asisten keuangan pribadi. Jawab dalam Bahasa Indonesia, 3-5 poin singkat, hanya berdasarkan angka yang diberikan. Jangan mengarang data.' },
      { role: 'user', content: JSON.stringify(payload) },
    ]);
    res.render('pages/dashboard', Object.assign({ title: 'Dashboard', aiTips: text, aiError: null }, data));
  } catch (err) {
    if (!err.expose) throw err;
    res.render('pages/dashboard', Object.assign({ title: 'Dashboard', aiTips: null, aiError: err.message }, data));
  }
};
