# TASK 01 — Project setup

## Steps
1. In the project root run:
```
npm init -y
npm i express@4 ejs better-sqlite3 express-session better-sqlite3-session-store bcryptjs helmet express-rate-limit multer csv-parse openai pdf-parse@1.1.1 dotenv
```
2. Edit `package.json` scripts to exactly:
```json
"scripts": {
  "start": "node server.js",
  "dev": "node --watch server.js",
  "backup": "node scripts/backup.js",
  "restore": "node scripts/restore.js"
}
```
3. Create every folder from the structure in the master prompt (add an empty `.gitkeep` in empty folders).
4. Create `.gitignore`:
```
node_modules/
.env
data/
backups/
certs/
```
5. Create `.env.example` (content in master prompt) and copy it to `.env`. Put a random 48+ char string in `SESSION_SECRET`.

## src/config/index.js (write exactly this)
```js
require('dotenv').config();
const path = require('path');

const root = path.join(__dirname, '..', '..');
const env = process.env;

if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be set in .env (min 32 characters)');
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
```

## src/app.js (write exactly this)
```js
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const config = require('./config');

function createApp() {
  const app = express();
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);
  app.set('view engine', 'ejs');
  app.set('views', path.join(config.root, 'views'));

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        // disabled until HTTPS is enabled in task 09, otherwise CSS/JS fail on http://localhost
        'upgrade-insecure-requests': config.https ? [] : null,
      },
    },
    hsts: config.https,
  }));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(path.join(config.root, 'public')));

  app.get('/health', (req, res) => res.send('ok'));
  // Later tasks add: session, csrf, auth, routes, error handlers.
  return app;
}

module.exports = createApp;
```

## server.js (write exactly this)
```js
const config = require('./src/config');
const createApp = require('./src/app');

const app = createApp();
app.listen(config.port, () => {
  console.log(`Money Tracker running on http://localhost:${config.port}`);
});
```

## Done check
- [ ] `npm start` runs without errors
- [ ] `http://localhost:3000/health` shows `ok`
- [ ] All folders exist, `.env` is in `.gitignore`
- [ ] No other files were created
