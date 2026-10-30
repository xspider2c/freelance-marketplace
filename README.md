# Freelance Marketplace

A web application where clients post projects and freelancers send proposals to work on them, similar to platforms like Upwork and Ponisha.

> This repository is part of the Software Lab course. Exercise 1 covered Project Kickoff & Requirements Analysis; Exercise 2 covers Database Design & Implementation.

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
├── database/
│   ├── schema.sql      # tables, keys, constraints, triggers
│   ├── seed.sql        # sample data
│   ├── queries.sql     # useful queries
│   └── tests.sql       # constraint / business-rule test scenarios
├── docs/
│   ├── erd.png
│   └── requirements.md
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

### Statuses and Transition Rules

**Project** (`draft`, `open`, `in_progress`, `completed`, `cancelled`)

| From          | Allowed next states                     |
|---------------|-----------------------------------------|
| `draft`       | `open`, `cancelled`                     |
| `open`        | `in_progress`, `cancelled`, `draft`     |
| `in_progress` | `completed`, `cancelled`                |
| `completed`, `cancelled` | final                        |

When a proposal is accepted, a trigger moves the project from `open` to `in_progress`. Proposals can only be submitted to `open` projects.

**Proposal** (`pending`, `accepted`, `rejected`, `withdrawn`)

A proposal always starts as `pending`. Only a `pending` proposal can become `accepted` or `rejected` (by the client) or `withdrawn` (by the freelancer). All other states are final. Who is allowed to perform each change is checked in the application layer.

### Test Scenarios (`database/tests.sql`)

| #   | Scenario                                           | Expected result                              | Enforced by                        |
|-----|----------------------------------------------------|----------------------------------------------|------------------------------------|
| T1  | Insert a user with a duplicate email               | Rejected (`unique_violation`)                | `UNIQUE` on email                  |
| T2  | Create a project with a non-existent `employer_id` | Rejected (`foreign_key_violation`)           | Foreign key                        |
| T3  | Same freelancer sends a second proposal to a project | Rejected (`unique_violation`)              | `UNIQUE(project_id, freelancer_id)`|
| T4  | Project budget = 0                                 | Rejected (`check_violation`)                 | `CHECK (budget > 0)`               |
| T4b | Proposal with a negative amount                    | Rejected (`check_violation`)                 | `CHECK (amount > 0)`               |
| T5  | Accept a second proposal on the same project       | Rejected; project stays `in_progress`        | Partial unique index + trigger     |
| T6  | Send a proposal to your own project                | Rejected                                     | Trigger                            |
| T7  | Admin creates a project                            | Rejected                                     | Trigger                            |
| T8  | Delete a user who owns projects                    | Rejected (`foreign_key_violation`)           | `ON DELETE RESTRICT`               |

## Status

Requirements analysis, Jira board, Git workflow, and database environment setup were completed in Exercise 1. Exercise 2 adds the database schema, ERD, sample data, queries, and constraint tests. Backend and frontend development have not started yet.
