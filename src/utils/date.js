const pad = (n) => String(n).padStart(2, '0');
const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function monthRange(d = new Date()) {
  return {
    from: toYMD(new Date(d.getFullYear(), d.getMonth(), 1)),
    to: toYMD(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
  };
}

// Week runs Monday..Sunday
function weekRange(d = new Date()) {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const start = new Date(day);
  start.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: toYMD(start), to: toYMD(end) };
}

function shiftDays(d, n) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

module.exports = { toYMD, monthRange, weekRange, shiftDays };
