import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { PasswordField } from '../components/Fields.jsx';
import { api } from '../api.js';
import { validateReset } from '../validation.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking | valid | invalid
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    api.validateResetToken(token)
      .then((d) => setStatus(d.valid ? 'valid' : 'invalid'))
      .catch(() => setStatus('invalid'));
  }, [token]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const errs = validateReset(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const data = await api.resetPassword({ token, ...form });
      navigate('/login', { replace: true, state: { notice: data.message } });
    } catch (err) {
      if (err.code === 'INVALID_TOKEN') setStatus('invalid');
      setFormError(err.message);
      setErrors(err.fields || {});
    } finally {
      setBusy(false);
    }
  }

  if (status === 'checking') {
    return <AuthLayout title="تعیین رمز عبور جدید"><p role="status">در حال بررسی لینک…</p></AuthLayout>;
  }

  if (status === 'invalid') {
    return (
      <AuthLayout title="لینک معتبر نیست" footer={<Link to="/login">بازگشت به ورود</Link>}>
        <p className="alert bad" role="alert">این لینک نامعتبر است، منقضی شده یا قبلاً استفاده شده است.</p>
        <Link className="btn btn-link" to="/forgot-password">درخواست لینک جدید</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="تعیین رمز عبور جدید" subtitle="رمز عبور جدید خود را وارد کنید.">
      {formError && <p className="alert bad" role="alert">{formError}</p>}
      <form onSubmit={onSubmit} noValidate>
        <PasswordField id="password" name="password" label="رمز عبور جدید" autoComplete="new-password"
          hint="حداقل ۸ کاراکتر، شامل حرف و عدد" value={form.password} onChange={onChange} error={errors.password} />
        <PasswordField id="confirmPassword" name="confirmPassword" label="تکرار رمز عبور جدید" autoComplete="new-password"
          value={form.confirmPassword} onChange={onChange} error={errors.confirmPassword} />
        <button className="btn" type="submit" disabled={busy}>{busy ? 'در حال ذخیره…' : 'ذخیره رمز جدید'}</button>
      </form>
    </AuthLayout>
  );
}
