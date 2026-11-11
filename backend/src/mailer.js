'use strict';

// در محیط توسعه سرویس ایمیل واقعی لازم نیست: لینک بازیابی در کنسول backend چاپ می‌شود.
// برای ایمیل واقعی می‌توان این تابع را با nodemailer (SMTP) جایگزین کرد.
async function sendPasswordResetEmail(to, link) {
  console.log('\n──────── [DEV MAIL] بازیابی رمز عبور ────────');
  console.log(`To:   ${to}`);
  console.log(`Link: ${link}`);
  console.log('─────────────────────────────────────────────\n');
}

module.exports = { sendPasswordResetEmail };
