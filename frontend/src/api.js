export class ApiError extends Error {
  constructor(message, status, fields, code) {
    super(message);
    this.status = status;
    this.fields = fields || {};
    this.code = code;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError('ارتباط با سرور برقرار نشد. اتصال را بررسی کنید و دوباره تلاش کنید.', 0);
  }
  let data = null;
  try { data = await res.json(); } catch { /* پاسخ بدون بدنه */ }
  if (!res.ok) throw new ApiError(data?.error || 'خطای غیرمنتظره‌ای رخ داد.', res.status, data?.fields, data?.code);
  return data;
}

export const api = {
  me: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  signup: (body) => request('/auth/signup', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  validateResetToken: (token) => request(`/auth/reset-password/validate?token=${encodeURIComponent(token)}`),
  resetPassword: (body) => request('/auth/reset-password', { method: 'POST', body }),
};
