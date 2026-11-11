// اعتبارسنجی سمت کلاینت (برای تجربه بهتر). اعتبارسنجی اصلی در backend انجام می‌شود.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const emailError = (v) => {
  if (!v.trim()) return 'ایمیل را وارد کنید.';
  if (!EMAIL_RE.test(v.trim())) return 'ایمیل واردشده معتبر نیست.';
  return null;
};

export const passwordError = (v) => {
  if (!v) return 'رمز عبور را وارد کنید.';
  if (v.length < 8) return 'رمز عبور باید حداقل ۸ کاراکتر باشد.';
  if (v.length > 128) return 'رمز عبور نباید بیش از ۱۲۸ کاراکتر باشد.';
  if (!/\p{L}/u.test(v) || !/\p{N}/u.test(v)) return 'رمز عبور باید شامل حداقل یک حرف و یک عدد باشد.';
  return null;
};

const clean = (errs) => Object.fromEntries(Object.entries(errs).filter(([, v]) => v));

export const validateLogin = ({ email, password }) =>
  clean({ email: email.trim() ? null : 'ایمیل را وارد کنید.', password: password ? null : 'رمز عبور را وارد کنید.' });

export const validateSignup = (f) =>
  clean({
    firstName: f.firstName.trim() ? null : 'نام را وارد کنید.',
    lastName: f.lastName.trim() ? null : 'نام خانوادگی را وارد کنید.',
    email: emailError(f.email),
    password: passwordError(f.password),
    confirmPassword: !f.confirmPassword ? 'تکرار رمز عبور را وارد کنید.' : f.password !== f.confirmPassword ? 'رمز عبور و تکرار آن یکسان نیستند.' : null,
  });

export const validateReset = ({ password, confirmPassword }) =>
  clean({
    password: passwordError(password),
    confirmPassword: !confirmPassword ? 'تکرار رمز عبور را وارد کنید.' : password !== confirmPassword ? 'رمز عبور و تکرار آن یکسان نیستند.' : null,
  });
