import { useState } from 'react';

function Message({ id, error, hint }) {
  if (error) return <p className="error" id={`${id}-error`} role="alert">{error}</p>;
  if (hint) return <p className="hint" id={`${id}-hint`}>{hint}</p>;
  return null;
}

const describedBy = (id, error, hint) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export function TextField({ id, label, error, hint, ...input }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={!!error} aria-describedby={describedBy(id, error, hint)} {...input} />
      <Message id={id} error={error} hint={hint} />
    </div>
  );
}

export function PasswordField({ id, label, error, hint, ...input }) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pw">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          dir="ltr"
          aria-invalid={!!error}
          aria-describedby={describedBy(id, error, hint)}
          {...input}
        />
        <button
          type="button"
          className="toggle"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-label={show ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
        >
          {show ? 'مخفی' : 'نمایش'}
        </button>
      </div>
      <Message id={id} error={error} hint={hint} />
    </div>
  );
}
