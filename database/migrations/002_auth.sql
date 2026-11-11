-- Migration 002: احراز هویت (بازیابی رمز عبور)
-- برای دیتابیسی که قبلاً با schema.sql ساخته شده است. (نشست‌ها را connect-pg-simple در جدول "session" می‌سازد.)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,           -- SHA-256 توکن؛ خود توکن ذخیره نمی‌شود
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,                         -- NULL = هنوز مصرف نشده
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_reset_token_expiry CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
