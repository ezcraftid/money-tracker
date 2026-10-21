require('dotenv').config();
const path = require('path');

const root = path.join(__dirname, '..', '..');
const env = process.env;

if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be set in .env (min 32 characters)');
}

if (!env.BACKUP_PASSPHRASE || env.BACKUP_PASSPHRASE.length < 16) {
  throw new Error('BACKUP_PASSPHRASE must be set in .env (min 16 characters)');
}

module.exports = {
  root,
  port: Number(env.PORT) || 3000,
  sessionSecret: env.SESSION_SECRET,
  dbPath: path.resolve(root, env.DB_PATH || 'data/app.db'),
  backupDir: path.resolve(root, env.BACKUP_DIR || 'backups'),
  backupPassphrase: env.BACKUP_PASSPHRASE || '',
  openrouterKey: env.OPENROUTER_API_KEY || '',
  openrouterModels: (env.OPENROUTER_MODELS || '').split(',').map(s => s.trim()).filter(Boolean),
  https: Boolean(env.HTTPS_KEY_PATH && env.HTTPS_CERT_PATH),
  httpsKeyPath: env.HTTPS_KEY_PATH || '',
  httpsCertPath: env.HTTPS_CERT_PATH || '',
  trustProxy: env.TRUST_PROXY ? Number(env.TRUST_PROXY) : 0,
};
