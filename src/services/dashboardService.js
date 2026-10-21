const report = require('../repositories/reportRepository');
const transactionRepository = require('../repositories/transactionRepository');
const { monthRange, weekRange, shiftDays } = require('../utils/date');
const { rupiah } = require('../utils/format');

function totals(from, to) {
  const t = { income: 0, expense: 0 };
  for (const r of report.totalsByType(from, to)) t[r.type] = r.total;
  return t;
}

function periodSummary({ from, to }) {
  const t = totals(from, to);
  return { ...t, net: t.income - t.expense, byCategory: report.expenseByCategory(from, to) };
}

function budgetAlerts(rows) {
  return rows
    .map(r => ({ category: r.name, limit: r.monthly_limit, spent: r.spent, percent: Math.round((r.spent / r.monthly_limit) * 100) }))
    .filter(r => r.percent >= 80)
    .map(r => ({ ...r, level: r.percent >= 100 ? 'over' : 'warn' }));
}

function ruleBasedTips(thisWeek, lastWeek) {
  const tips = [];
  const prev = Object.fromEntries(lastWeek.byCategory.map(c => [c.name, c.total]));
  for (const c of thisWeek.byCategory) {
    const before = prev[c.name] || 0;
    if (before > 0 && c.total > before * 1.3) {
      tips.push(`Pengeluaran ${c.name} naik ${Math.round((c.total / before - 1) * 100)}% dibanding minggu lalu.`);
    }
  }
  if (thisWeek.byCategory[0]) tips.push(`Kategori terbesar minggu ini: ${thisWeek.byCategory[0].name} (${rupiah(thisWeek.byCategory[0].total)}).`);
  if (thisWeek.expense > thisWeek.income && thisWeek.income > 0) tips.push('Pengeluaran minggu ini lebih besar dari pemasukan.');
  return tips.slice(0, 4);
}

function getDashboard(today = new Date()) {
  const month = monthRange(today);
  const thisWeek = periodSummary(weekRange(today));
  const lastWeek = periodSummary(weekRange(shiftDays(today, -7)));
  return {
    month: periodSummary(month),
    balances: report.accountBalances(),
    alerts: budgetAlerts(report.budgetUsage(month.from, month.to)),
    thisWeek,
    lastWeek,
    tips: ruleBasedTips(thisWeek, lastWeek),
    topCategories: periodSummary(month).byCategory.slice(0, 5),
    recent: transactionRepository.list({}, 10, 0),
  };
}

module.exports = { getDashboard, budgetAlerts, ruleBasedTips };
