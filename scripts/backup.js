const { createBackup } = require('../src/services/backupService');
createBackup().then(f => { console.log('Backup dibuat:', f); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });
