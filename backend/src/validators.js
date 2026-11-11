'use strict';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const TOKEN_RE = /^[a-f0-9]{64}$/;

const normalizeEmail = (v) => String(v ?? '').trim().toLowerCase();
const isString = (v) => typeof v === 'string';

function validateEmail(raw) {
  if (!isString(raw) || raw.trim() === '') return 'ایمیل را وارد کنید.';
  const email = normalizeEmail(raw);
  if (email.length > 255 || !EMAIL_RE.test(email)) return 'ایمیل واردشده معتبر نیست.';
  return null;
}

function validatePassword(pw) {
  if (!isString(pw) || pw === '') return 'رمز عبور را وارد کنید.';
  if (pw.length < 8) return 'رمز عبور باید حداقل ۸ کاراکتر باشد.';
  if (pw.length > 128) return 'رمز عبور نباید بیش از ۱۲۸ کاراکتر باشد.';
  if (!/\p{L}/u.test(pw) || !/\p{N}/u.test(pw)) return 'رمز عبور باید شامل حداقل یک حرف و یک عدد باشد.';
  return null;
}

function validateName(v, label) {
  if (!isString(v) || v.trim() === '') return `${label} را وارد کنید.`;
  if (v.trim().length > 100) return `${label} نباید بیش از ۱۰۰ کاراکتر باشد.`;
  return null;
}

function validateSignup(body) {
  const errors = {};
  const e1 = validateName(body.firstName, 'نام'); if (e1) errors.firstName = e1;
  const e2 = validateName(body.lastName, 'نام خانوادگی'); if (e2) errors.lastName = e2;
  const e3 = validateEmail(body.email); if (e3) errors.email = e3;
  const e4 = validatePassword(body.password); if (e4) errors.password = e4;
  if (!errors.password && body.password !== body.confirmPassword) {
    errors.confirmPassword = 'رمز عبور و تکرار آن یکسان نیستند.';
  } else if (!isString(body.confirmPassword) || body.confirmPassword === '') {
    errors.confirmPassword = 'تکرار رمز عبور را وارد کنید.';
  }
  return errors;
}

module.exports = { EMAIL_RE, TOKEN_RE, normalizeEmail, validateEmail, validatePassword, validateSignup };
