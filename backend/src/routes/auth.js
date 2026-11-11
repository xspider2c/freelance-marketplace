'use strict';
const crypto = require('crypto');
const express = require('express');
const pool = require('../db');
const rateLimit = require('../middleware/rateLimit');
const { hashPassword, verifyPassword } = require('../security/password');
const { sendPasswordResetEmail } = require('../mailer');
const { TOKEN_RE, normalizeEmail, validateEmail, validatePassword, validateSignup } = require('../validators');

const router = express.Router();
const TTL_MINUTES = Number(process.env.RESET_TOKEN_TTL_MINUTES) || 30;
const APP_URL = (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');

const GENERIC_LOGIN_ERROR = 'ایمیل یا رمز عبور اشتباه است.';
const FORGOT_MESSAGE = 'اگر این ایمیل در سیستم ثبت شده باشد، لینک بازیابی رمز عبور برای آن ارسال می‌شود.';
const INVALID_LINK = 'لینک بازیابی نامعتبر است یا منقضی شده است.';

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// هش ساختگی برای یکسان‌سازی زمان پاسخ وقتی ایمیل وجود ندارد
let dummyHash;
const getDummyHash = () => (dummyHash ||= hashPassword('dummy-password-for-timing-1'));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'تعداد تلاش‌ها زیاد است. چند دقیقه بعد دوباره امتحان کنید.' });
const signupLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: 'تعداد درخواست‌ها زیاد است. بعداً دوباره امتحان کنید.' });
const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'تعداد درخواست‌ها زیاد است. چند دقیقه بعد دوباره امتحان کنید.' });

const USER_SELECT = `
  SELECT u.id, u.first_name, u.last_name, u.email, u.password_hash, u.status,
         (a.user_id IS NOT NULL) AS is_admin
  FROM users u LEFT JOIN admins a ON a.user_id = u.id`;

const publicUser = (u) => ({
  id: String(u.id), firstName: u.first_name, lastName: u.last_name, email: u.email, isAdmin: u.is_admin,
});

// ---------- ثبت‌نام ----------
router.post('/signup', signupLimiter, asyncHandler(async (req, res) => {
  const body = req.body || {};
  const errors = validateSignup(body);
  if (Object.keys(errors).length) return res.status(400).json({ error: 'اطلاعات واردشده معتبر نیست.', fields: errors });

  const passwordHash = await hashPassword(body.password);
  try {
    await pool.query(
      'INSERT INTO users (first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4)',
      [body.firstName.trim(), body.lastName.trim(), normalizeEmail(body.email), passwordHash]
    );
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'این ایمیل قبلاً ثبت شده است.', fields: { email: 'این ایمیل قبلاً ثبت شده است.' } });
    }
    throw err;
  }
  res.status(201).json({ message: 'حساب شما ساخته شد. اکنون می‌توانید وارد شوید.' });
}));

// ---------- ورود ----------
router.post('/login', loginLimiter, asyncHandler(async (req, res, next) => {
  const { email, password } = req.body || {};
  const fields = {};
  if (typeof email !== 'string' || email.trim() === '') fields.email = 'ایمیل را وارد کنید.';
  if (typeof password !== 'string' || password === '') fields.password = 'رمز عبور را وارد کنید.';
  if (Object.keys(fields).length) return res.status(400).json({ error: 'لطفاً فیلدهای خالی را پر کنید.', fields });

  const { rows } = await pool.query(`${USER_SELECT} WHERE lower(u.email) = $1`, [normalizeEmail(email)]);
  const user = rows[0];
  const ok = await verifyPassword(password, user ? user.password_hash : await getDummyHash());
  if (!user || !ok) return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
  if (user.status !== 'active') return res.status(403).json({ error: 'حساب شما فعال نیست. با پشتیبانی تماس بگیرید.' });

  // ساخت نشست جدید (جلوگیری از Session Fixation)
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = String(user.id);
    req.session.save((err2) => (err2 ? next(err2) : res.json({ user: publicUser(user) })));
  });
}));

// ---------- کاربر فعلی ----------
router.get('/me', asyncHandler(async (req, res) => {
  const id = req.session && req.session.userId;
  if (!id) return res.json({ user: null });
  const { rows } = await pool.query(`${USER_SELECT} WHERE u.id = $1`, [id]);
  const user = rows[0];
  if (!user || user.status !== 'active') {
    req.session.destroy(() => {});
    return res.json({ user: null });
  }
  res.json({ user: publicUser(user) });
}));

// ---------- خروج ----------
router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('fm.sid');
    res.json({ message: 'از حساب خود خارج شدید.' });
  });
});

// ---------- فراموشی رمز عبور ----------
async function issueResetToken(email) {
  const { rows } = await pool.query(`${USER_SELECT} WHERE lower(u.email) = $1 AND u.status = 'active'`, [email]);
  const user = rows[0];
  if (!user) return;
  await pool.query('UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [user.id]);
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + ($3 * interval '1 minute'))`,
    [user.id, sha256(token), TTL_MINUTES]
  );
  await sendPasswordResetEmail(user.email, `${APP_URL}/reset-password?token=${token}`);
}

router.post('/forgot-password', forgotLimiter, asyncHandler(async (req, res) => {
  const raw = (req.body || {}).email;
  const emailError = validateEmail(raw);
  if (emailError) return res.status(400).json({ error: emailError, fields: { email: emailError } });

  // پاسخ یکسان و فوری، چه ایمیل وجود داشته باشد چه نه (عدم افشای وجود حساب)
  res.json({ message: FORGOT_MESSAGE });
  issueResetToken(normalizeEmail(raw)).catch((err) => console.error('Reset token error:', err.message));
}));

// ---------- بررسی اعتبار لینک ----------
router.get('/reset-password/validate', asyncHandler(async (req, res) => {
  const token = String(req.query.token || '');
  if (!TOKEN_RE.test(token)) return res.json({ valid: false });
  const { rowCount } = await pool.query(
    'SELECT 1 FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()',
    [sha256(token)]
  );
  res.json({ valid: rowCount === 1 });
}));

// ---------- تعیین رمز جدید ----------
router.post('/reset-password', forgotLimiter, asyncHandler(async (req, res) => {
  const { token, password, confirmPassword } = req.body || {};
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return res.status(400).json({ error: INVALID_LINK, code: 'INVALID_TOKEN' });

  const fields = {};
  const pwError = validatePassword(password);
  if (pwError) fields.password = pwError;
  else if (password !== confirmPassword) fields.confirmPassword = 'رمز عبور و تکرار آن یکسان نیستند.';
  if (Object.keys(fields).length) return res.status(400).json({ error: 'اطلاعات واردشده معتبر نیست.', fields });

  const newHash = await hashPassword(password);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() FOR UPDATE`,
      [sha256(token)]
    );
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: INVALID_LINK, code: 'INVALID_TOKEN' });
    }
    const userId = rows[0].user_id;
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
    await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [userId]);
    // خروج از همه نشست‌های قبلی این کاربر
    await client.query(`DELETE FROM "session" WHERE sess->>'userId' = $1`, [String(userId)]);
    await client.query('COMMIT');
    res.json({ message: 'رمز عبور شما تغییر کرد. اکنون می‌توانید وارد شوید.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}));

module.exports = router;
