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
