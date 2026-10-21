// "15.000", "Rp 15.000", "15000" -> 15000. Returns null when invalid.
function parseAmount(raw) {
  const str = String(raw ?? '').trim();
  const negative = str.startsWith('-') || str.startsWith('(');
  let s = str.replace(/[^\d.,]/g, '');
  s = s.replace(/[.,]\d{1,2}$/, '');   // drop decimals like ",00" (rupiah has none)
  s = s.replace(/[.,]/g, '');          // drop thousand separators
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? (negative ? -n : n) : null;
}

// Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY. Returns 'YYYY-MM-DD' or null.
function parseDate(raw) {
  const s = String(raw ?? '').trim();
  let m;
  let y; let mo; let d;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
  else if ((m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
  else return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
module.exports = { parseAmount, parseDate };
