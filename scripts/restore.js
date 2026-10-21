const fs = require('fs');
const Database = require('better-sqlite3');
const config = require('../src/config');
const { decryptBuffer } = require('../src/services/backupCrypto');

const file = process.argv[2];
if (!file) { console.error('Pemakaian: npm run restore -- <file.mtbk>'); process.exit(1); }

const tmp = config.dbPath + '.restoring';
try {
  fs.writeFileSync(tmp, decryptBuffer(fs.readFileSync(file)));
  const conn = new Database(tmp, { readonly: true });
  const ok = conn.pragma('integrity_check', { simple: true });
  conn.close();
  if (ok !== 'ok') throw new Error('Backup rusak: ' + ok);
} catch (err) {
  fs.rmSync(tmp, { force: true });
  console.error(err.message);
  process.exit(1);
}

if (fs.existsSync(config.dbPath)) fs.renameSync(config.dbPath, `${config.dbPath}.before-restore-${Date.now()}`);
for (const ext of ['-wal', '-shm']) fs.rmSync(config.dbPath + ext, { force: true });
fs.renameSync(tmp, config.dbPath);
console.log('Restore selesai. Jalankan ulang aplikasi.');
