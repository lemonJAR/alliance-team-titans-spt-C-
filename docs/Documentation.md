# Student Performance Tracker — Documentation

## Overview
The Student Performance Tracker (SPT) is a web application for managing student performance data. It includes:
- Role-based authentication for admins, teachers, and students.
- Enrollment workflows and subject offerings.
- Grade entry, review, reporting, and audit logging.
- Notifications and email verification flows.

## Architecture
- **Frontend:** React + Vite (`frontend/`)
- **Backend:** ASP.NET Core API (maintained separately)

## Key Modules
### Authentication & Profiles
- Registration, login, logout, email verification, password reset.
- Role-specific profiles (student, teacher, admin).

### Enrollment & Offerings
- Admin: create programs, subjects, offerings.
- Student: submit enrollment requests and select schedules.
- Admin: approve/reject enrollment queue.

### Grades
- Teacher: post/update/delete grades.
- Student: view grades, timeline, export.
- Admin: override grade entries.

### Reports & Audit
- Admin: generate grade summary reports, export PDF/CSV/XLSX, print.
- Audit logs for key actions, filterable by action, actor type, actor ID, or actor email.

### Notifications
- System notifications for offerings, enrollment, and grade updates.

## API Surface (high-level)
- Auth: `/auth/*`
- System: `/system/*`
- Reports: `/system/reports/*`

## Tech Notes
- Configure the API origin with `VITE_API_BASE_URL` in the frontend environment.
- The client expects JWT authentication and sends a Bearer token.

## Known Constraints
- Client-side role checks improve navigation but do not replace server-side
  authorization in the ASP.NET Core API.

## File Map (Core)
- `frontend/src/pages/` — role dashboards
- `frontend/src/routes/` — protected routes and RBAC
- `frontend/src/controllers/` — action orchestration
- `frontend/src/models/` — client session model
- `frontend/src/services/api.jsx` — ASP.NET Core API adapter
