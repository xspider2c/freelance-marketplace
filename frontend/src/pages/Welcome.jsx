import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import { useAuth } from '../AuthContext.jsx';

export default function Welcome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    try { await logout(); } finally { navigate('/login', { replace: true }); }
  }

  return (
    <AuthLayout title={`خوش آمدید، ${user.firstName} ${user.lastName}`}>
      <dl className="facts">
        <div><dt>شناسه کاربر</dt><dd dir="ltr">{user.id}</dd></div>
        <div><dt>ایمیل</dt><dd dir="ltr">{user.email}</dd></div>
        <div><dt>نوع حساب</dt><dd>{user.isAdmin ? 'مدیر' : 'کاربر عادی'}</dd></div>
      </dl>
      <button className="btn btn-quiet" type="button" onClick={onLogout} disabled={busy}>
        {busy ? 'در حال خروج…' : 'خروج'}
      </button>
    </AuthLayout>
  );
}
