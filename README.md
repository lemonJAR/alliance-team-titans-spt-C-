# Student Performance Tracker

React/Vite frontend for the Student Performance Tracker. The server-side
implementation is being migrated to ASP.NET Core and is not included in this
repository.

## Development

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Set `VITE_API_BASE_URL` in `frontend/.env` to the URL of the C# API. The
frontend sends JWT credentials using the `Authorization: Bearer <token>` header.

## Development demo accounts

When running the frontend with Vite's development server, these temporary
local accounts can be used to preview each role:

| Role | Email | Password |
| --- | --- | --- |
| Student | `student@example.com` | `Student123!` |
| Professor | `professor@example.com` | `Professor123!` |
| Admin | `admin@example.com` | `Admin123!` |

These accounts are disabled in production builds. They are synthetic frontend
demo sessions, not real API credentials, and must not be used in production.

## Architecture

- `frontend/src/pages/` contains screen-level views.
- `frontend/src/routes/` contains route guards and navigation policy.
- `frontend/src/controllers/` contains user-action orchestration.
- `frontend/src/models/` contains client-side session state.
- `frontend/src/services/api.jsx` is the HTTP adapter for the ASP.NET Core API.

The client enforces role-aware navigation for `ADMIN`, `PROFESSOR`, and
`STUDENT`. Authorization must also be enforced by the C# API; client-side RBAC
is a UX boundary, not a security boundary.

## Commands

```powershell
npm run dev
npm run lint
npm run build
```
