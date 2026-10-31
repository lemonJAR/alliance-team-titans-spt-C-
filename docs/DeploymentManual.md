# Student Performance Tracker — Deployment Manual

## Local Development (Windows)
### ASP.NET Core API
The C# API is maintained separately. Start it using that project's
instructions, then set `VITE_API_BASE_URL` in `frontend/.env`.

### Frontend
1. Open a terminal and go to `frontend/`.
2. Install dependencies using npm.
3. Copy `.env.example` to `.env` and configure the API URL.
4. Start the Vite dev server.

## Production Notes
- Serve the frontend with a production build (`npm run build`).

## Optional: Static Files
## Smoke Checklist
- Login works for admin/teacher/student
- Enrollment flow works end‑to‑end
- Grade posting and viewing works
- Reports export functions work
- Notifications and audit logs load
