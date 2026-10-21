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
