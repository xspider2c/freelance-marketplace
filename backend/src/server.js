'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db');
const authRoutes = require('./routes/auth');

const isProd = process.env.NODE_ENV === 'production';
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.error('SESSION_SECRET تنظیم نشده یا کوتاه‌تر از ۳۲ کاراکتر است. فایل .env را بررسی کنید.');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
if (isProd) app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(session({
  store: new pgSession({ pool, createTableIfMissing: true }),
  name: 'fm.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

app.use('/api/auth', authRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'مسیر یافت نشد.' }));

// در حالت production اگر فرانت‌اند build شده باشد از همین سرور ارائه می‌شود
const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (isProd && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'قالب درخواست نامعتبر است.' });
  console.error(err);
  res.status(500).json({ error: 'خطای داخلی سرور. دوباره تلاش کنید.' });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
