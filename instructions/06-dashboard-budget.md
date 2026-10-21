# TASK 06 — Dashboard, weekly summary, budgets, alerts

## Dashboard (GET /) shows, in this order
1. Three stat boxes: pemasukan, pengeluaran, selisih for the CURRENT MONTH.
2. Saldo per akun (table).
3. Peringatan anggaran (only if any budget is >= 80%).
4. Ringkasan minggu ini vs minggu lalu (Mon-Sun) + saran hemat (rule-based).
5. Top 5 kategori pengeluaran bulan ini.
6. 10 transaksi terakhir.
Plain tables and text only. No charts, no icons.

## SQL to use (put in `src/repositories/reportRepository.js`, params always bound)
```sql
-- totals by type in a date range
SELECT type, COALESCE(SUM(amount), 0) AS total
FROM transactions WHERE date BETWEEN ? AND ? GROUP BY type;

-- expense by category in a date range
SELECT COALESCE(c.name, 'Tanpa kategori') AS name, SUM(t.amount) AS total
FROM transactions t LEFT JOIN categories c ON c.id = t.category_id
WHERE t.type = 'expense' AND t.date BETWEEN ? AND ?
GROUP BY t.category_id ORDER BY total DESC;

-- account balances
SELECT a.id, a.name, a.initial_balance +
  COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount WHEN t.type = 'expense' THEN -t.amount END), 0) AS balance
FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id
GROUP BY a.id ORDER BY a.name;

-- budget usage for a month
SELECT b.category_id, c.name, b.monthly_limit, COALESCE(SUM(t.amount), 0) AS spent
FROM budgets b JOIN categories c ON c.id = b.category_id
LEFT JOIN transactions t ON t.category_id = b.category_id AND t.type = 'expense' AND t.date BETWEEN ? AND ?
GROUP BY b.id ORDER BY c.name;
```
Export functions: `totalsByType(from,to)`, `expenseByCategory(from,to)`, `accountBalances()`, `budgetUsage(from,to)`. Convert `totalsByType` rows into `{ income, expense }` in the service.

## src/services/dashboardService.js (follow this)
```js
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
    thisWeek, lastWeek,
    tips: ruleBasedTips(thisWeek, lastWeek),
    topCategories: periodSummary(month).byCategory.slice(0, 5),
    recent: transactionRepository.list({}, 10, 0),
  };
}

module.exports = { getDashboard, budgetAlerts, ruleBasedTips };
```
Alert text in the view: "Mendekati batas (85%)" with class `alert-warn`, "Melebihi batas (112%)" with class `alert-over`.

## Budgets (GET/POST /budgets)
- Page lists expense categories with an input "Batas per bulan (Rp)" and a Simpan button each (one form per row, POST `/budgets/:categoryId`).
- Empty or 0 value = remove the budget. Use `parseAmount`; invalid -> flash error.
- Also show this month's usage (spent / limit / percent) in the same table.
- Files: `budgetService.js`, `budgetController.js`, `routes/budgets.js`, `views/pages/budgets.ejs`.

## Done check
- [ ] Dashboard renders with an empty database (no errors, shows 0 values)
- [ ] With sample transactions, month totals and account balances are correct (check one by hand)
- [ ] A budget at 85% shows the warn alert; at 110% shows the over alert
- [ ] Weekly summary uses Monday as the first day
- [ ] No `toISOString()` anywhere
