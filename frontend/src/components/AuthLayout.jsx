export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="shell">
      <aside className="brand">
        <p className="wordmark">بازار فریلنسری</p>
        <div className="brand-body">
          <p className="brand-headline">پروژه را ثبت کنید، پیشنهاد بگیرید.</p>
          <ol className="flow">
            <li>کارفرما پروژه ثبت می‌کند</li>
            <li>فریلنسرها پیشنهاد می‌فرستند</li>
            <li>کارفرما یک پیشنهاد را می‌پذیرد</li>
          </ol>
        </div>
      </aside>
      <main className="panel">
        <div className="card">
          <h1>{title}</h1>
          {subtitle && <p className="sub">{subtitle}</p>}
          {children}
          {footer && <div className="foot">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
