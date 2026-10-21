const bcrypt = require('bcryptjs');
const db = require('../db');
const userRepository = require('../repositories/userRepository');
const { ValidationError } = require('../utils/errors');

const COST = 12;
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', COST);

const needsSetup = () => userRepository.count() === 0;

function validateCredentials(username, password, confirm) {
  const errors = [];
  if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username || '')) errors.push('Username 3-32 karakter: huruf, angka, titik, strip, garis bawah.');
  if (!password || password.length < 10) errors.push('Password minimal 10 karakter.');
  if (password !== confirm) errors.push('Konfirmasi password tidak sama.');
  if (errors.length) throw new ValidationError(errors);
}

async function createFirstUser(username, password, confirm) {
  validateCredentials(username, password, confirm);
  const hash = await bcrypt.hash(password, COST);
  db.transaction(() => {
    if (userRepository.count() > 0) throw new ValidationError(['Setup sudah dilakukan.']);
    userRepository.create(username, hash);
  })();
}

// Returns the user or null. Always runs one bcrypt compare (hides whether the username exists).
async function verifyLogin(username, password) {
  const user = userRepository.findByUsername(String(username || ''));
  const ok = await bcrypt.compare(String(password || ''), user ? user.password_hash : DUMMY_HASH);
  return user && ok ? user : null;
}

module.exports = { needsSetup, createFirstUser, verifyLogin };
