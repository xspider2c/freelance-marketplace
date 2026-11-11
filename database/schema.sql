-- Freelance Marketplace - PostgreSQL 15+
-- اجرا: psql -U postgres -d freelance_marketplace -f database/schema.sql

DROP TABLE IF EXISTS password_reset_tokens, proposals, project_skills, project_categories, projects,
  profile_skills, certificates, portfolios, user_profiles,
  skills, categories, admins, users CASCADE;
DROP TYPE IF EXISTS account_status, pricing_type, project_status, proposal_status CASCADE;

CREATE TYPE account_status  AS ENUM ('active', 'inactive', 'blocked');
CREATE TYPE pricing_type    AS ENUM ('fixed_price', 'hourly');
CREATE TYPE project_status  AS ENUM ('draft', 'open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE proposal_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');

-- ---------- کاربران ----------
CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  phone         VARCHAR(20)  UNIQUE,                       -- اختیاری
  password_hash VARCHAR(255) NOT NULL,                     -- هش (bcrypt/argon2) نه متن ساده
  status        account_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT chk_password_hash_len CHECK (char_length(password_hash) >= 20)
);
CREATE UNIQUE INDEX uq_users_email_lower ON users (lower(email));

-- ---------- مدیران (جدول جدا؛ وجود ردیف = ادمین بودن) ----------
CREATE TABLE admins (
  user_id    BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,   -- NULL برای ادمین اولیه
  CONSTRAINT chk_not_self_grant CHECK (granted_by IS NULL OR granted_by <> user_id)
);

-- ---------- پروفایل ----------
CREATE TABLE user_profiles (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,  -- حداکثر یک پروفایل
  headline   VARCHAR(150),
  bio        TEXT,
  location   VARCHAR(150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE portfolios (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id  BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  url         VARCHAR(500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE certificates (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  profile_id    BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  issuer        VARCHAR(200),
  issued_date   DATE,
  credential_url VARCHAR(500),
  CONSTRAINT chk_cert_date CHECK (issued_date IS NULL OR issued_date <= CURRENT_DATE)
);

-- ---------- مهارت و دسته‌بندی ----------
CREATE TABLE skills (
  id   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);
CREATE TABLE categories (
  id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE profile_skills (            -- N:M پروفایل ↔ مهارت
  profile_id BIGINT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  skill_id   BIGINT NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  PRIMARY KEY (profile_id, skill_id)
);

-- ---------- پروژه ----------
CREATE TABLE projects (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employer_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title         VARCHAR(200) NOT NULL,
  description   TEXT NOT NULL,
  pricing_type  pricing_type NOT NULL,
  budget        NUMERIC(14,2) NOT NULL,      -- fixed: کل بودجه | hourly: نرخ ساعتی
  status        project_status NOT NULL DEFAULT 'draft',
  deadline      DATE,                        -- اختیاری
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_project_budget_positive CHECK (budget > 0)
);
CREATE INDEX idx_projects_employer ON projects(employer_id);
CREATE INDEX idx_projects_status   ON projects(status);

CREATE TABLE project_categories (
  project_id  BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  PRIMARY KEY (project_id, category_id)
);
CREATE TABLE project_skills (
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  skill_id   BIGINT NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
  PRIMARY KEY (project_id, skill_id)
);
CREATE INDEX idx_project_categories_cat ON project_categories(category_id);
CREATE INDEX idx_project_skills_skill   ON project_skills(skill_id);

-- ---------- پیشنهاد ----------
CREATE TABLE proposals (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id      BIGINT NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  freelancer_id   BIGINT NOT NULL REFERENCES users(id)    ON DELETE RESTRICT,
  amount          NUMERIC(14,2) NOT NULL,    -- fixed: مبلغ کل | hourly: نرخ ساعتی
  cover_letter    TEXT NOT NULL,
  estimated_days  INT,                       -- اختیاری
  estimated_hours INT,                       -- اختیاری (فقط پروژه ساعتی)
  status          proposal_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_one_proposal_per_user_project UNIQUE (project_id, freelancer_id),
  CONSTRAINT chk_proposal_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_est_days_positive  CHECK (estimated_days  IS NULL OR estimated_days  > 0),
  CONSTRAINT chk_est_hours_positive CHECK (estimated_hours IS NULL OR estimated_hours > 0)
);
CREATE INDEX idx_proposals_freelancer ON proposals(freelancer_id);
-- حداکثر یک پیشنهاد پذیرفته‌شده در هر پروژه
CREATE UNIQUE INDEX uq_one_accepted_per_project ON proposals(project_id) WHERE status = 'accepted';

-- ---------- بازیابی رمز عبور ----------
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

-- ================= Triggers =================
CREATE OR REPLACE FUNCTION fn_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_touch     BEFORE UPDATE ON users         FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_profiles_touch  BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_projects_touch  BEFORE UPDATE ON projects      FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
CREATE TRIGGER trg_proposals_touch BEFORE UPDATE ON proposals     FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- قانون 10: ادمین نه پروژه ثبت کند، نه پیشنهاد بدهد، نه پروفایل داشته باشد
CREATE OR REPLACE FUNCTION fn_no_admin_as_regular() RETURNS trigger AS $$
DECLARE uid BIGINT;
BEGIN
  IF TG_TABLE_NAME = 'projects' THEN uid := NEW.employer_id;
  ELSIF TG_TABLE_NAME = 'proposals' THEN uid := NEW.freelancer_id;
  ELSE uid := NEW.user_id; END IF;
  IF EXISTS (SELECT 1 FROM admins WHERE user_id = uid) THEN
    RAISE EXCEPTION 'Admin accounts cannot act as employer/freelancer (user %)', uid;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_no_admin  BEFORE INSERT OR UPDATE OF employer_id   ON projects      FOR EACH ROW EXECUTE FUNCTION fn_no_admin_as_regular();
CREATE TRIGGER trg_proposals_no_admin BEFORE INSERT OR UPDATE OF freelancer_id ON proposals     FOR EACH ROW EXECUTE FUNCTION fn_no_admin_as_regular();
CREATE TRIGGER trg_profiles_no_admin  BEFORE INSERT OR UPDATE OF user_id       ON user_profiles FOR EACH ROW EXECUTE FUNCTION fn_no_admin_as_regular();

-- تبدیل کاربر به ادمین فقط اگر سابقه پروژه/پیشنهاد/پروفایل نداشته باشد
CREATE OR REPLACE FUNCTION fn_admin_grant_check() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM projects WHERE employer_id = NEW.user_id)
     OR EXISTS (SELECT 1 FROM proposals WHERE freelancer_id = NEW.user_id)
     OR EXISTS (SELECT 1 FROM user_profiles WHERE user_id = NEW.user_id) THEN
    RAISE EXCEPTION 'User % already has regular-user data and cannot become admin', NEW.user_id;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_admin_grant BEFORE INSERT ON admins FOR EACH ROW EXECUTE FUNCTION fn_admin_grant_check();

-- قوانین ثبت پیشنهاد: پروژه باز، نه پروژه خود فریلنسر، تعداد ساعات فقط برای ساعتی
CREATE OR REPLACE FUNCTION fn_proposal_insert_rules() RETURNS trigger AS $$
DECLARE p projects%ROWTYPE;
BEGIN
  SELECT * INTO p FROM projects WHERE id = NEW.project_id;
  IF p.status <> 'open' THEN
    RAISE EXCEPTION 'Proposals can only be submitted to open projects';
  END IF;
  IF p.employer_id = NEW.freelancer_id THEN
    RAISE EXCEPTION 'A user cannot submit a proposal to their own project';
  END IF;
  IF NEW.estimated_hours IS NOT NULL AND p.pricing_type <> 'hourly' THEN
    RAISE EXCEPTION 'estimated_hours is only valid for hourly projects';
  END IF;
  IF NEW.status <> 'pending' THEN
    RAISE EXCEPTION 'New proposals must start as pending';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_proposal_insert BEFORE INSERT ON proposals FOR EACH ROW EXECUTE FUNCTION fn_proposal_insert_rules();

-- قوانین تغییر وضعیت پیشنهاد + به‌روزرسانی وضعیت پروژه هنگام پذیرش
CREATE OR REPLACE FUNCTION fn_proposal_status_rules() RETURNS trigger AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF OLD.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending proposals can change status (from % to %)', OLD.status, NEW.status;
  END IF;
  IF NEW.status = 'accepted' THEN
    IF (SELECT status FROM projects WHERE id = NEW.project_id) <> 'open' THEN
      RAISE EXCEPTION 'Can only accept a proposal of an open project';
    END IF;
    UPDATE projects SET status = 'in_progress' WHERE id = NEW.project_id;
    -- FR-10: بستن بقیه پیشنهادهای در انتظار همین پروژه
    UPDATE proposals SET status = 'rejected'
     WHERE project_id = NEW.project_id AND id <> NEW.id AND status = 'pending';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_proposal_status BEFORE UPDATE OF status ON proposals FOR EACH ROW EXECUTE FUNCTION fn_proposal_status_rules();

-- قواعد تغییر وضعیت پروژه
CREATE OR REPLACE FUNCTION fn_project_status_rules() RETURNS trigger AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NOT ( (OLD.status='draft'       AND NEW.status IN ('open','cancelled'))
        OR (OLD.status='open'        AND NEW.status IN ('in_progress','cancelled','draft'))
        OR (OLD.status='in_progress' AND NEW.status IN ('completed','cancelled')) ) THEN
    RAISE EXCEPTION 'Invalid project status transition % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_project_status BEFORE UPDATE OF status ON projects FOR EACH ROW EXECUTE FUNCTION fn_project_status_rules();
