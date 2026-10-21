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
