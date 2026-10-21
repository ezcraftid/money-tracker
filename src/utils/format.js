const nf = new Intl.NumberFormat('id-ID');
const rupiah = (n) => 'Rp ' + nf.format(n);
const dateID = (ymd) => { const [y, m, d] = ymd.split('-'); return `${d}/${m}/${y}`; };
module.exports = { rupiah, dateID };
