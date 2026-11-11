'use strict';
const crypto = require('crypto');
const { promisify } = require('util');

const pbkdf2 = promisify(crypto.pbkdf2);

// PBKDF2-HMAC-SHA512 با salt تصادفی و تعداد تکرار بالا (توصیه OWASP)
const ALGORITHM = 'pbkdf2_sha512';
const ITERATIONS = 210000;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

// قالب خروجی: pbkdf2_sha512$iterations$salt(base64)$hash(base64)
async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derived = await pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
  return [ALGORITHM, ITERATIONS, salt.toString('base64'), derived.toString('base64')].join('$');
}

async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== ALGORITHM) return false;
  const iterations = Number(parts[1]);
  const salt = Buffer.from(parts[2], 'base64');
  const expected = Buffer.from(parts[3], 'base64');
  if (!Number.isInteger(iterations) || iterations < 1 || expected.length === 0) return false;
  const derived = await pbkdf2(password, salt, iterations, expected.length, 'sha512');
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

module.exports = { hashPassword, verifyPassword };
