# Student Performance Tracker (SPT)

A web application for managing student enrollment and academic performance in a school. Administrators set up the school structure and approve enrollments, professors post and update grades for their classes, and students request subjects, pick their class schedules and follow their grades over time.

Built by **Alliance Team Titans**.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Database](#1-database)
  - [2. Backend (API)](#2-backend-api)
  - [3. Frontend](#3-frontend)
  - [4. Demo data (optional)](#4-demo-data-optional)
- [Demo Accounts](#demo-accounts)
- [Configuration Reference](#configuration-reference)
- [How the System Works](#how-the-system-works)
- [API Overview](#api-overview)
- [Useful Commands](#useful-commands)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)
- [Security Notes](#security-notes)

---

## Features

### Admin
- **School Setup:** colleges, degree programs, subjects (with prerequisites) and semester unit limits.
- **Academic terms and subject offerings:** sections with a professor, schedule, room and slot limit.
- **Add Teacher / Add Student:** create professor accounts and pre-register student IDs or full student accounts.
- **Enrollment queue:** approve or reject student enrollment requests.
- **User Management:** edit, deactivate or delete users.
- **Grade Overrides:** view and correct any grade entry.
- **Reports:** grade summary reports with export to PDF, CSV and Excel, plus print.
- **Notifications and Audit Logs:** a paginated log of system notifications and every important action, with filters by action, actor type, actor ID and email.

### Professor
- See the offerings assigned to them and the students in each class.
- Post, update and delete preliminary, midterm and finals grades with remarks.
- Receive in-app notifications.

### Student
- Sign up with a pre-registered student ID and verify the email address.
- View the program prospectus, request subjects, and choose a class schedule once a request is approved.
- View grades, the grade history timeline, and export results.
- Receive in-app notifications about enrollment and grade updates.

### Platform
- Role-based access (Admin, Professor, Student) with JWT authentication.
- Deactivated or deleted accounts lose access immediately, even with a valid token.
- Email verification and password reset links.
- Full audit trail and per-grade modification history.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router 7, Axios, jsPDF / jsPDF-AutoTable |
| Backend | ASP.NET Core (.NET 9) Web API, Entity Framework Core 8 (Pomelo MySQL provider) |
| Auth | JWT bearer tokens, BCrypt password hashing |
| Reports | ClosedXML (Excel), CSV export |
| Database | MySQL 8 |

---

## Project Structure

```
.
├── backend/                 ASP.NET Core Web API
│   ├── Controllers/         Auth, Admin, Enrollment, Grades, Offerings, Reports, ...
│   ├── Models/              EF Core entities
│   ├── Data/                SptDbContext, DbSeeder (admin), DemoSeeder (demo data)
│   ├── Services/            Token, Audit, Email, Password and Grade rules
│   ├── appsettings.json     Default configuration
│   └── Program.cs           App startup, auth, seeding
├── database/
│   ├── 01_schema.sql        Creates the spt_db schema (drops it first!)
│   ├── 02_seed.sql          Minimal base data
│   ├── 03_offering_schedule_room.sql   Migration for existing databases only
│   └── 04_demo_seed.sql     Demo data (optional)
├── frontend/                React + Vite app
│   └── src/
│       ├── pages/           Login, SignUp, Admin / Teacher / Student portals, ...
│       ├── controllers/     Thin wrappers around API calls
│       ├── services/api.jsx Axios instance and endpoint definitions
│       └── routes/          Role-protected routes
└── docs/                    Documentation, user manual, deployment manual, test report
```

---

## Getting Started

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) 20 or newer, with npm
- [MySQL 8](https://dev.mysql.com/downloads/) (and MySQL Workbench or the `mysql` CLI)

### 1. Database

> **Warning:** `01_schema.sql` runs `DROP DATABASE IF EXISTS spt_db`. Only run it on a fresh install, never on a database that holds data you want to keep.

Run the scripts in order as the MySQL `root` user:

```bash
mysql -u root -p < database/01_schema.sql
mysql -u root -p < database/02_seed.sql
```

Then create the application user that the API connects with (this matches the default connection string):

```sql
CREATE USER 'spt_user'@'localhost' IDENTIFIED BY 'password123!';
GRANT ALL PRIVILEGES ON spt_db.* TO 'spt_user'@'localhost';
FLUSH PRIVILEGES;
```

Use a stronger password for anything other than your own machine, and update the connection string to match.

`02_seed.sql` loads one college (CCS), one program (BSIT), three subjects, semester loads, one active term (2025-2026, 1st semester) and three pre-registered student IDs: `2025-0001`, `2025-0002`, `2025-0003`.

### 2. Backend (API)

```bash
cd backend
dotnet restore
```

Create `backend/appsettings.Development.json`. It is git-ignored, so each developer keeps their own copy with their own secrets:

```json
{
  "ConnectionStrings": {
    "Default": "Server=localhost;Port=3306;Database=spt_db;User=spt_user;Password=password123!;"
  },
  "Jwt": {
    "Key": "replace-with-a-random-string-of-at-least-32-characters",
    "Issuer": "SptApi",
    "Audience": "SptFrontend",
    "ExpireMinutes": 480
  },
  "Seed": {
    "AdminEmail": "admin@spt.local",
    "AdminPassword": "admin123!"
  }
}
```

Generate a JWT key with `openssl rand -base64 48`. The API refuses to start if the key is shorter than 32 characters or the connection string is missing.

Start the API:

```bash
dotnet run --launch-profile http
```

The API listens on **http://localhost:5259**. Check it at `http://localhost:5259/api/health`.

On the first start the API creates the admin account from `Seed:AdminEmail` and `Seed:AdminPassword` if no admin exists yet.

> **Emails in development.** The API does not send real email. Verification and password reset links are **printed in the API console**. Copy the link from there to verify an account or reset a password.

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env` (copy `.env.example`) and point the dev proxy at the API:

```env
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:5259
```

If you run the API with the `https` launch profile instead, use `https://localhost:5001` as the proxy target.

Start the dev server:

```bash
npm run dev
```

Open **http://localhost:5173** and sign in. The frontend calls `/api/...` and Vite proxies those requests to the backend, so no CORS setup is needed in development.

### 4. Demo data (optional)

For a realistic dataset to try every screen (5 professors, 11 students, enrollments in every status, grades with history, and enough notifications and audit entries to see pagination), use **one** of these:

**Option A: seed on API startup.** Add `"DemoData": true` under `Seed` in `appsettings.Development.json`:

```json
"Seed": {
  "AdminEmail": "admin@spt.local",
  "AdminPassword": "admin123!",
  "DemoData": true
}
```

It runs once and does nothing on later starts. Do not enable it in production.

**Option B: SQL script.** Run it after the schema and base seed. It is safe to re-run.

```bash
mysql -u root -p < database/04_demo_seed.sql
```

---

## Demo Accounts

These exist after you start the API (admin) and load the demo data (everyone else).

| Role | Email | Password |
|---|---|---|
| Admin | `admin@spt.local` | `admin123!` |
| Professor | `prof.santos@spt.local` (also `prof.reyes`, `prof.cruz`, `prof.lim`, `prof.ocampo`) | `Password123` |
| Student | `mark.delacruz@student.spt.local` (also `jane.villanueva`, `camille.navarro`, ...) | `Password123` |

Student emails follow the pattern `first.last@student.spt.local`. Student IDs `2025-0003`, `2025-0013` and `2025-0014` are pre-registered but unclaimed, so you can use them to test the sign-up flow.

Change or remove these accounts before any real deployment.

---

## Configuration Reference

| Setting | Where | Purpose |
|---|---|---|
| `ConnectionStrings:Default` | `appsettings*.json` or env `ConnectionStrings__Default` | MySQL connection string. |
| `Jwt:Key` | `appsettings*.json` or env `Jwt__Key` | Token signing key, minimum 32 characters. |
| `Jwt:Issuer`, `Jwt:Audience` | `appsettings*.json` | Token validation values. |
| `Jwt:ExpireMinutes` | `appsettings*.json` | Token lifetime (default 480). |
| `App:FrontendUrl` | `appsettings*.json` | Frontend address, used when building email links. |
| `Registration:ProfessorsNeedApproval` | `appsettings*.json` | Whether professor sign-ups wait for admin approval. |
| `Seed:AdminEmail`, `Seed:AdminPassword` | `appsettings*.json` | First admin account, created only if no admin exists. |
| `Seed:DemoData` | `appsettings.Development.json` | Set `true` to load demo data on startup. |
| `VITE_API_BASE_URL` | `frontend/.env` | API base URL used by the browser (default `/api`). |
| `VITE_API_PROXY_TARGET` | `frontend/.env` | Backend URL the Vite dev server proxies to. |

In deployment, prefer environment variables (for example `Jwt__Key`) over files.

---

## How the System Works

**Roles.** `ADMIN`, `PROFESSOR` and `STUDENT`. Each role has its own portal and its own protected route.

**Sign-up.** Students can only register with a student ID that an admin has already pre-registered. After sign-up they must verify their email before logging in. Professors are created by an admin, or can sign up themselves. When `ProfessorsNeedApproval` is on (the default), a self-registered professor stays inactive until an admin activates the account in User Management.

**Enrollment flow.**
1. The student requests a subject for the active term (`PENDING`). Requests are checked against prerequisites and the semester unit limit.
2. An admin approves or rejects the request in the enrollment queue (`APPROVED` or `REJECTED`).
3. The student picks an offering (section and schedule) for the approved subject and becomes `ENROLLED`. The offering's slot count goes up, and a section that is full cannot be chosen.

**Grades.** Professors enter preliminary, midterm and finals grades for students enrolled in their own offerings. Every change is recorded in the grade history, and admins can override entries.
- Scale: `1.00` (best) to `5.00`, in steps of `0.25`.
- Passing: `3.00` or better.

**Passwords.** At least 8 characters, with at least one letter and one number, and no longer than 72 bytes.

**Notifications and audit.** Enrollment and grade events create in-app notifications. Administrative actions, logins, grade changes and report exports are written to the audit log (the API returns the latest 500 entries, shown 10 per page).

---

## API Overview

All endpoints are under `/api` and return JSON (snake_case). Protected endpoints need an `Authorization: Bearer <token>` header.

| Area | Base path |
|---|---|
| Authentication and accounts | `/api/auth/*` (login, register, verify email, password reset, profile) |
| Admin (users, audit logs) | `/api/auth/admin/*` |
| Notifications | `/api/auth/notifications` |
| School setup (colleges, programs, subjects, loads) | `/api/system/*` |
| Terms, offerings, enrollment, grades | `/api/system/*` |
| Grade reports and exports | `/api/system/reports/grades` |
| Health check | `/api/health` |

---

## Useful Commands

| Where | Command | What it does |
|---|---|---|
| `backend/` | `dotnet run --launch-profile http` | Run the API on port 5259. |
| `backend/` | `dotnet build` | Compile the API. |
| `frontend/` | `npm run dev` | Start the dev server on port 5173. |
| `frontend/` | `npm run build` | Production build into `frontend/dist`. |
| `frontend/` | `npm run preview` | Serve the production build locally. |
| `frontend/` | `npm run lint` | Run ESLint. |

---

## Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| API exits with `ConnectionStrings:Default is missing` | Create `backend/appsettings.Development.json` (see step 2). |
| API exits with `Jwt:Key is missing or shorter than 32 characters` | Set a longer `Jwt:Key`. |
| `Access denied for user 'spt_user'` | Create the MySQL user and grant privileges (step 1), and check the password in the connection string. |
| Frontend shows network errors or `502` on `/api` calls | The API is not running, or `VITE_API_PROXY_TARGET` does not match its URL and port. Restart `npm run dev` after editing `.env`. |
| Cannot log in as a new student | The email is probably not verified yet. Copy the verification link from the API console. |
| A new professor cannot log in | Self-registered professors need an admin to activate them (Admin, User Management) unless `Registration:ProfessorsNeedApproval` is `false`. |
| Sign-up says the student ID is not registered | An admin must pre-register the ID first (Admin, Add Student), or use one of the unclaimed demo IDs. |
| Demo accounts do not exist | Demo data is off by default. Enable `Seed:DemoData` or run `04_demo_seed.sql` (step 4). |
| Need to start the database from scratch | Re-run `01_schema.sql` and `02_seed.sql`. This deletes all data. |

---

## Documentation

More detail lives in the `docs/` folder:

- [Documentation.md](docs/Documentation.md): overview of the architecture and modules
- [UserManual.md](docs/UserManual.md): guides for students, teachers and admins
- [DeploymentManual.md](docs/DeploymentManual.md): local and production deployment notes
- [TestResultsReport.md](docs/TestResultsReport.md): test results

There is no automated test suite yet. Testing so far is manual and recorded in the test report.

---

## Security Notes

- `backend/appsettings.json` ships with sample values for the database password, JWT key and admin credentials. **Replace all of them** for any shared or deployed environment, and keep real secrets in environment variables or in the git-ignored `appsettings.Development.json`.
- Change the default admin password after the first login.
- Never enable `Seed:DemoData` in production. The demo accounts share a publicly documented password.
- The API has no CORS policy because the frontend reaches it through the Vite proxy. In production, serve both from the same origin (for example behind a reverse proxy), or add a CORS policy for your frontend's address.
- Emails are only printed to the console. Replace `ConsoleEmailSender` with a real `IEmailSender` implementation before relying on verification or password reset in production.
