import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { TextField } from '../components/Fields.jsx';
import { api } from '../api.js';
import { emailError } from '../validation.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setFormError('');
    const err = emailError(email);
    setError(err || '');
    if (err) return;
    setBusy(true);
    try {
      const data = await api.forgotPassword(email);
      setMessage(data.message);
    } catch (err2) {
      setFormError(err2.message);
      setError(err2.fields?.email || '');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="بازیابی رمز عبور"
      subtitle="ایمیل حساب خود را وارد کنید تا لینک تعیین رمز جدید برای شما ارسال شود."
      footer={<><Link to="/login">بازگشت به ورود</Link> · <Link to="/signup">ایجاد حساب جدید</Link></>}
    >
      {message ? (
        <>
          <p className="alert ok" role="status">{message}</p>
          {import.meta.env.DEV && (
            <p className="hint">محیط توسعه: لینک بازیابی در کنسولِ سرور (backend) چاپ می‌شود.</p>
          )}
        </>
      ) : (
        <>
          {formError && <p className="alert bad" role="alert">{formError}</p>}
          <form onSubmit={onSubmit} noValidate>
            <TextField id="email" name="email" label="ایمیل" type="email" dir="ltr" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
            <button className="btn" type="submit" disabled={busy}>{busy ? 'در حال ارسال…' : 'ارسال لینک بازیابی'}</button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
