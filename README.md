# Freelance Marketplace

A web application where clients post projects and freelancers send proposals to work on them, similar to platforms like Upwork and Ponisha.

> This repository is part of the Software Lab course. Exercise 1 covered Project Kickoff & Requirements Analysis; Exercise 2 covers Database Design & Implementation. Exercise 3 covers Login, Sign-up and Password Recovery.

## Project Goal

The goal of this project is to design and build a freelancing marketplace. Clients can post projects, freelancers can browse them and submit proposals, and the client can choose the freelancer they prefer.

## Project Management

- **Jira board:** [https://zian37855-1792736471940.atlassian.net/jira/software/projects/FM/boards/1](https://zian37855-1792736471940.atlassian.net/jira/software/projects/FM/boards/1)

## System Roles

| Role       | Description                                                 |
|------------|-------------------------------------------------------------|
| Client     | Posts projects, reviews proposals, and selects a freelancer |
| Freelancer | Builds a profile, searches projects, and submits proposals  |
| Admin      | Manages users and projects                                  |

A regular user can act as both Client (Employer) and Freelancer. Admins are separate accounts and cannot post projects or send proposals.

## Technologies

| Part     | Technology        |
|----------|-------------------|
| Frontend | React             |
| Backend  | Node.js (Express) |
| Database | PostgreSQL 15+    |

## Documentation

- [Requirements analysis](docs/requirements.md): analysis of similar platforms, functional and non-functional requirements, MVP, and open questions.
- [ERD diagram](docs/erd.png): entity-relationship diagram of the database.

## Repository Structure

```
freelance-marketplace/
├── backend/                 # Node.js + Express API (auth)
│   ├── src/
│   │   ├── server.js        # app, session, security headers
│   │   ├── db.js            # PostgreSQL pool
│   │   ├── validators.js    # server-side validation
│   │   ├── mailer.js        # dev mailer (prints reset link to console)
│   │   ├── security/password.js     # PBKDF2 hashing
│   │   ├── middleware/rateLimit.js
│   │   └── routes/auth.js   # signup, login, logout, me, forgot/reset password
│   ├── .env.example
│   └── package.json
├── frontend/                # React (Vite) UI
│   └── src/ (pages: Login, Signup, ForgotPassword, ResetPassword, Welcome)
├── database/
│   ├── schema.sql           # tables, constraints, triggers (+ password_reset_tokens)
│   ├── migrations/002_auth.sql
│   ├── seed.sql / queries.sql / tests.sql
├── docs/ (erd.png, requirements.md)
├── .gitignore
└── README.md
```

## Database

**DBMS:** PostgreSQL 15 or newer (uses `ENUM` types, partial unique indexes, and PL/pgSQL triggers).

### Setup

```bash
createdb freelance_marketplace
psql -d freelance_marketplace -f database/schema.sql    # tables and constraints
psql -d freelance_marketplace -f database/seed.sql      # sample data
psql -d freelance_marketplace -f database/queries.sql   # example queries
psql -d freelance_marketplace -f database/tests.sql     # test scenarios (results printed as NOTICE)
```

`schema.sql` drops and recreates all tables, so it can be re-run safely on a development database.

### Tables

`users`, `admins`, `user_profiles`, `portfolios`, `certificates`, `skills`, `categories`, `profile_skills`, `project_skills`, `project_categories`, `projects`, `proposals`.

### Design Decisions

- **One account type for Client and Freelancer.** There is no separate role column. A user is an employer through `projects.employer_id` and a freelancer through `proposals.freelancer_id`.
- **Admin access modeled as a separate `admins` table** (`user_id` PK/FK, `granted_at`, `granted_by`). Reasons: admin accounts are easy to identify, the grant time (and who granted it) is recorded, `users` has no nullable role-specific columns, and more roles can be added later. A trigger enforces that admins cannot create projects, send proposals, or own a profile, and a user who already has projects, proposals, or a profile cannot be made an admin.
- **Profiles** are 1-to-0..1 with users (`UNIQUE(user_id)`). Portfolios and certificates are separate 1-to-many tables. Skills use the junction table `profile_skills`.
- **Many-to-many relations** (`profile_skills`, `project_skills`, `project_categories`) use junction tables with composite primary keys, which also prevents duplicates.
- **Uniqueness:** email (also case-insensitive), phone (optional), `skills.name`, `categories.title`, and `UNIQUE(project_id, freelancer_id)` on proposals.
- **At most one accepted proposal per project:** a partial unique index on `proposals(project_id) WHERE status = 'accepted'`.
- **Price fields:** `projects.budget` is the total budget for fixed-price projects or the hourly rate for hourly projects; `proposals.amount` follows the same meaning. Both must be `> 0`. `estimated_days` and `estimated_hours` are optional and must be `> 0`; `estimated_hours` is only allowed on hourly projects (trigger).
- **Deletion:** `ON DELETE RESTRICT` for users, projects, and proposals so history is never lost. Accounts are deactivated with `status = 'inactive'` or `'blocked'` instead of being deleted. Only owned child data (portfolios, certificates, profile and project junction rows) uses `CASCADE`.
- **Passwords:** only `password_hash` is stored (hashing with bcrypt/argon2 is done in the backend).
- **Timestamps:** `created_at` and `updated_at` are maintained automatically by triggers.

### Authentication (Exercise 3)

Login, sign-up and password recovery, connected to the project database. Other parts of the platform are not implemented yet.

### Features
- **Sign up:** first name, last name, email, password + confirmation; server-side validation; duplicate email rejected (`409`); the user is stored in `users`.
- **Login:** email + password with show/hide toggle; the error message never says whether the email or the password is wrong; empty fields are validated; after success the user goes to a temporary **Welcome** page.
- **Session:** server-side session stored in PostgreSQL (table `session`), `HttpOnly` + `SameSite=Lax` cookie; the Welcome page is protected; **Logout** destroys the session; the session id is regenerated at login.
- **Forgot / reset password:** a random 256-bit token is generated; only its SHA-256 hash is stored in `password_reset_tokens` (expires in 30 minutes, single use). In development the link is printed in the backend console instead of being emailed. The response never reveals whether an email exists. After a reset all old sessions of that user are removed.
- **Only `active` accounts can log in** (`inactive`/`blocked` are refused).

### Security decisions
- Passwords are hashed in the **backend** with **PBKDF2-HMAC-SHA512** (210,000 iterations, random 16-byte salt, constant-time comparison). Format: `pbkdf2_sha512$iterations$salt$hash`. No plain text, MD5, or plain SHA-256.
- Timing equalisation: a dummy hash is verified when the email does not exist.
- Simple in-memory rate limiting on login, signup and reset endpoints; `helmet` security headers; JSON body limit of 10 KB.
- Secrets live in `backend/.env` (ignored by Git). Use `backend/.env.example` as a template.
- Note: the users in `database/seed.sql` have fake password hashes and cannot log in. Create an account through the sign-up page.

### API
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/signup` | create account |
| POST | `/api/auth/login` | log in (creates session) |
| POST | `/api/auth/logout` | log out |
| GET  | `/api/auth/me` | current user (`null` if not logged in) |
| POST | `/api/auth/forgot-password` | request reset link (generic response) |
| GET  | `/api/auth/reset-password/validate?token=` | is the link valid? |
| POST | `/api/auth/reset-password` | set a new password |

### How to run
Requirements: Node.js 18+ and PostgreSQL 15+.

```bash
# 1) database (if it already exists, run only migrations/002_auth.sql)
createdb freelance_marketplace
psql -d freelance_marketplace -f database/schema.sql

# 2) backend  (http://localhost:4000)
cd backend
cp .env.example .env        # then edit DATABASE_URL and SESSION_SECRET
npm install
npm run dev

# 3) frontend (http://localhost:5173) - in another terminal
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. For "forgot password", copy the link printed in the backend terminal.

### Manual test scenarios
| # | Scenario | Expected |
|---|---|---|
| A1 | Login with empty fields | field messages, no request to DB |
| A2 | Login with wrong password / unknown email | same generic message for both |
| A3 | Sign up with different password & confirmation | rejected with message |
| A4 | Sign up with an existing email | rejected (409) |
| A5 | After sign-up, check `users.password_hash` | starts with `pbkdf2_sha512$`, not plain text |
| A6 | Login success → refresh → open `/welcome` | still logged in |
| A7 | Click Logout then open `/welcome` | redirected to login |
| A8 | Forgot password with existing and non-existing email | identical message |
| A9 | Open the printed link, set new password, login | works |
| A10 | Open the same link again | rejected as used/invalid |
| A11 | Open a link with a wrong or expired token | rejected |

## Team
- <نام و نام خانوادگی اعضای تیم را اینجا بنویسید>

## Status

Requirements analysis, Jira board and Git workflow (Exercise 1), database schema, ERD, sample data and tests (Exercise 2), and the authentication feature (Exercise 3) are done. Other platform features (projects, proposals UI, dashboard) have not been implemented yet.
