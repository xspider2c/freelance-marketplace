import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { PasswordField, TextField } from '../components/Fields.jsx';
import { api } from '../api.js';
import { validateSignup } from '../validation.js';

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const errs = validateSignup(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api.signup(form);
      navigate('/login', { replace: true, state: { notice: 'ثبت‌نام با موفقیت انجام شد. اکنون با ایمیل و رمز عبور خود وارد شوید.' } });
    } catch (err) {
      setFormError(err.message);
      setErrors(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="ایجاد حساب جدید"
      footer={<>قبلاً ثبت‌نام کرده‌اید؟ <Link to="/login">ورود</Link></>}
    >
      {formError && <p className="alert bad" role="alert">{formError}</p>}
      <form onSubmit={onSubmit} noValidate>
        <div className="row">
          <TextField id="firstName" name="firstName" label="نام" autoComplete="given-name"
            value={form.firstName} onChange={onChange} error={errors.firstName} />
          <TextField id="lastName" name="lastName" label="نام خانوادگی" autoComplete="family-name"
            value={form.lastName} onChange={onChange} error={errors.lastName} />
        </div>
        <TextField id="email" name="email" label="ایمیل" type="email" dir="ltr" autoComplete="email"
          value={form.email} onChange={onChange} error={errors.email} />
        <PasswordField id="password" name="password" label="رمز عبور" autoComplete="new-password"
          hint="حداقل ۸ کاراکتر، شامل حرف و عدد" value={form.password} onChange={onChange} error={errors.password} />
        <PasswordField id="confirmPassword" name="confirmPassword" label="تکرار رمز عبور" autoComplete="new-password"
          value={form.confirmPassword} onChange={onChange} error={errors.confirmPassword} />
        <button className="btn" type="submit" disabled={busy}>{busy ? 'در حال ثبت‌نام…' : 'ثبت‌نام'}</button>
      </form>
    </AuthLayout>
  );
}
