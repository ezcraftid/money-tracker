const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');

function latestBackup() {
  if (!fs.existsSync(config.backupDir)) return null;
  const files = fs.readdirSync(config.backupDir).filter(f => f.endsWith('.mtbk')).sort();
  return files.length ? path.join(config.backupDir, files[files.length - 1]) : null;
}

function checkIntegrity() {
  if (!fs.existsSync(config.dbPath)) return;                // first run
  let result;
  try {
    const conn = new Database(config.dbPath, { readonly: true });
    result = conn.pragma('integrity_check', { simple: true });
    conn.close();
  } catch (err) {
    result = err.message;
  }
  if (result !== 'ok') {
    const latest = latestBackup();
    console.error('DATABASE RUSAK:', result);
    console.error(latest ? `Pulihkan dengan: npm run restore -- "${latest}"` : 'Tidak ada backup ditemukan.');
    process.exit(1);
  }
}

module.exports = { checkIntegrity };
