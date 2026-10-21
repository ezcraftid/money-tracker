# TASK 09 — HTTPS, encrypted backup, database recovery

## 1. HTTPS
Two options. Support both; the app chooses by `.env`.
- **A. Direct HTTPS** (LAN / home server): set `HTTPS_KEY_PATH` and `HTTPS_CERT_PATH`. Self-signed example (the browser will warn once):
```
mkdir certs
openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=localhost"
```
- **B. Behind a reverse proxy** (Caddy, Nginx, Cloudflare Tunnel): the proxy does TLS, the app runs plain HTTP. Set `TRUST_PROXY=1` and `HTTPS_KEY_PATH`/`HTTPS_CERT_PATH` empty. The session cookie must still be `secure`: in `src/config/session.js` use `secure: config.https || config.trustProxy > 0`, and in `src/app.js` use the same expression instead of `config.https` for the helmet `upgrade-insecure-requests` and `hsts` options.

### server.js (replace with this)
```js
const fs = require('fs');
const http = require('http');
const https = require('https');
const config = require('./src/config');
const { checkIntegrity } = require('./src/db/health');

checkIntegrity();                      // exits with instructions if the database is corrupt
require('./src/db/migrate')();

const createApp = require('./src/app');   // must be required AFTER migrate()
const { startBackupSchedule } = require('./src/services/backupService');

const app = createApp();
const server = config.https
  ? https.createServer({ key: fs.readFileSync(config.httpsKeyPath), cert: fs.readFileSync(config.httpsCertPath) }, app)
  : http.createServer(app);

server.listen(config.port, () => {
  console.log(`Money Tracker running on ${config.https ? 'https' : 'http'}://localhost:${config.port}`);
  startBackupSchedule();
});
```

## 2. Config check
In `src/config/index.js`, add after the SESSION_SECRET check:
```js
if (!env.BACKUP_PASSPHRASE || env.BACKUP_PASSPHRASE.length < 16) {
  throw new Error('BACKUP_PASSPHRASE must be set in .env (min 16 characters)');
}
```

## 3. Backup encryption — src/services/backupCrypto.js (no db import!)
```js
const crypto = require('crypto');
const config = require('../config');

const MAGIC = Buffer.from('MTBK1');   // file header = format marker

const deriveKey = (salt) => crypto.scryptSync(config.backupPassphrase, salt, 32);

function encryptBuffer(plain) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(salt), iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), enc]);   // 5 + 16 + 12 + 16 bytes header
}

function decryptBuffer(buf) {
  if (!buf.subarray(0, 5).equals(MAGIC)) throw new Error('Bukan file backup yang valid.');
  const salt = buf.subarray(5, 21);
  const iv = buf.subarray(21, 33);
  const tag = buf.subarray(33, 49);
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(salt), iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(buf.subarray(49)), decipher.final()]);
  } catch {
    throw new Error('Passphrase salah atau file backup rusak.');
  }
}

module.exports = { encryptBuffer, decryptBuffer };
```

## 4. src/services/backupService.js
```js
const fs = require('fs');
const path = require('path');
const db = require('../db');
const config = require('../config');
const { encryptBuffer } = require('./backupCrypto');

const KEEP = 14;
const DAY = 24 * 60 * 60 * 1000;

function listBackups() {
  if (!fs.existsSync(config.backupDir)) return [];
  return fs.readdirSync(config.backupDir).filter(f => f.endsWith('.mtbk')).sort();   // oldest -> newest
}

function rotate() {
  const files = listBackups();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP))) fs.rmSync(path.join(config.backupDir, f));
}

async function createBackup() {
  fs.mkdirSync(config.backupDir, { recursive: true });
  const tmp = path.join(config.backupDir, `.tmp-${Date.now()}.db`);
  try {
    await db.backup(tmp);                                    // consistent snapshot, safe while app is running
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const out = path.join(config.backupDir, `backup-${stamp}.mtbk`);
    fs.writeFileSync(out, encryptBuffer(fs.readFileSync(tmp)));
    rotate();
    return out;
  } finally {
    fs.rmSync(tmp, { force: true });                         // never leave the unencrypted copy behind
  }
}

function startBackupSchedule() {
  const run = () => {
    const files = listBackups();
    const last = files.length ? fs.statSync(path.join(config.backupDir, files[files.length - 1])).mtimeMs : 0;
    if (Date.now() - last < 20 * 60 * 60 * 1000) return;   // skip if a backup is < 20h old (frequent restarts)
    createBackup().then(f => console.log('Backup dibuat:', path.basename(f))).catch(e => console.error('Backup gagal:', e.message));
  };
  run();
  setInterval(run, DAY).unref();
}

module.exports = { createBackup, startBackupSchedule, listBackups };
```

### scripts/backup.js
```js
const { createBackup } = require('../src/services/backupService');
createBackup().then(f => { console.log('Backup dibuat:', f); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
```

## 5. Database recovery
### src/db/health.js (opens its OWN read-only connection; do not import ./index)
```js
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
```

### scripts/restore.js (run with the app STOPPED)
```js
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
```

## 6. Final security checklist (run through each, report PASS/FAIL)
- [ ] `.env`, `data/`, `backups/`, `certs/` are in `.gitignore`
- [ ] `npm run backup` creates a `.mtbk` file; opening it in a text editor shows unreadable data
- [ ] Restore with the correct passphrase works; with a wrong passphrase prints "Passphrase salah..."
- [ ] After a restore the old database is kept as `app.db.before-restore-<time>`
- [ ] Corrupting a copy of the db (overwrite some bytes) makes the app exit with the restore instruction
- [ ] No `.tmp-*.db` file remains in `backups/`
- [ ] With HTTPS on, the session cookie has the `Secure` flag
- [ ] Login limit (5 attempts / 15 min) still works
- [ ] `grep -rn "console.log" src` shows no passwords, keys or transaction details
- [ ] `npm audit` reviewed; report anything high/critical

Tell me at the end: how to start the app, how to run a backup, and how to restore. Max 10 lines.
