import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { PasswordField, TextField } from '../components/Fields.jsx';
import { useAuth } from '../AuthContext.jsx';
import { validateLogin } from '../validation.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const notice = location.state?.notice;

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const errs = validateLogin(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate('/welcome', { replace: true });
    } catch (err) {
      setFormError(err.message);
      setErrors(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="ورود به حساب"
      footer={<>حساب ندارید؟ <Link to="/signup">ایجاد حساب جدید</Link></>}
    >
      {notice && <p className="alert ok" role="status">{notice}</p>}
      {formError && <p className="alert bad" role="alert">{formError}</p>}
      <form onSubmit={onSubmit} noValidate>
        <TextField id="email" name="email" label="ایمیل" type="email" dir="ltr" autoComplete="email"
          value={form.email} onChange={onChange} error={errors.email} />
        <PasswordField id="password" name="password" label="رمز عبور" autoComplete="current-password"
          value={form.password} onChange={onChange} error={errors.password} />
        <p className="aside-link"><Link to="/forgot-password">رمز عبور را فراموش کرده‌اید؟</Link></p>
        <button className="btn" type="submit" disabled={busy}>{busy ? 'در حال ورود…' : 'ورود'}</button>
      </form>
    </AuthLayout>
  );
}
