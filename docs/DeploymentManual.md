# Student Performance Tracker — Deployment Manual

**Version:** 1.1 (updated November 24, 2026)
**Repository:** https://github.com/lemonJAR/alliance-team-titans-spt-C-

The backend ASP.NET Core API **is part of this repository** (`backend/`). It is not a separate project.

---

## 1. Architecture

```
Browser ──► React + Vite SPA (frontend/)
              │  /api/*  (JSON, Bearer JWT)
              ▼
        ASP.NET Core 9 Web API (backend/, project SptApi)
              │  EF Core + Pomelo
              ▼
        MySQL 8  (database "spt_db")
```

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, React Router 7, axios, jsPDF (locked, print-only PDF export in browser) |
| Backend | .NET 9 (`net9.0`), JWT Bearer auth, BCrypt password hashing; layered as Controller → Service → Repository → EF Core (see `Architecture.md`) |
| Database | MySQL 8 (utf8mb4), 17 tables |

## 2. Prerequisites

| Tool | Version | Used for |
| --- | --- | --- |
| .NET SDK | 9.0 | build/run the API |
| Node.js + npm | Node 20.19+ or 22+ (tested with Node 22) | build/run the frontend |
| MySQL Server | 8.x | database |
| MySQL Workbench or `mysql` CLI | any | run the SQL scripts |
| Git | any | get the source |

## 3. Get the source
```bash
git clone https://github.com/lemonJAR/alliance-team-titans-spt-C-.git
cd alliance-team-titans-spt-C-
```
Branches: `main` (stable) and `develop` (active work).

## 4. Database setup

> ⚠ **`01_schema.sql` begins with `DROP DATABASE IF EXISTS spt_db;`.** Running it on an existing database **erases all data**. Never run it on a live system.

Run in this order as a MySQL administrator (root):

| # | Script | Purpose | Notes |
| --- | --- | --- | --- |
| 1 | `database/01_schema.sql` | Creates `spt_db` and all tables | Already contains the `schedule`/`room` columns |
| 2 | `database/02_seed.sql` | College CCS, program BSIT, 3 subjects, semester loads, **one active term (2025-2026 Sem 1)**, pre-registered students `2025-0001…0003` | Required |
| 3 | `database/03_offering_schedule_room.sql` | Adds `schedule`/`room` to `offerings` | **Skip on fresh installs** (already in 01; running it fails with "Duplicate column"). Only for databases created from an older schema. |
| 4 | `database/04_demo_seed.sql` | Demo accounts, offerings, grades, audit data | **Development/demo only. Do not load in production.** |
| 5 | `database/05_remove_audit_ip.sql` | Drops `ip_address` from `audit_logs` | **Skip on fresh installs** (column no longer in 01). Run once on databases created before this change; running it twice fails. |

Create a dedicated database user (do not use root):
```sql
CREATE USER 'spt_user'@'localhost' IDENTIFIED BY '<strong-password>';
GRANT SELECT, INSERT, UPDATE, DELETE ON spt_db.* TO 'spt_user'@'localhost';
FLUSH PRIVILEGES;
```

> After loading `02_seed.sql` the only active term ended on 2025-12-19. As the first admin task, **create or activate the current term** (Admin → Subject Offerings → Create new term), otherwise students see "Enrollment is currently closed."

## 5. Local development

### 5.1 Backend
1. Edit `backend/appsettings.Development.json` (git-ignored, create if missing):
```json
{
  "ConnectionStrings": { "Default": "Server=localhost;Port=3306;Database=spt_db;User=spt_user;Password=<password>;" },
  "Jwt": { "Key": "<random string, 32+ characters>", "Issuer": "SptApi", "Audience": "SptFrontend", "ExpireMinutes": 480 },
  "App": { "FrontendUrl": "http://localhost:5173" },
  "Registration": { "ProfessorsNeedApproval": true },
  "Seed": { "AdminEmail": "admin@spt.local", "AdminPassword": "<admin-password>", "DemoData": false }
}
```
   Set `"DemoData": true` only if you want demo accounts (see User Manual §6).
2. Run:
```bash
cd backend
dotnet restore
dotnet run --launch-profile http     # http://localhost:5259
```
   Profiles in `Properties/launchSettings.json`: `http` → `http://localhost:5259`; `https` → `https://localhost:5001` and `http://localhost:5000`.
3. On startup the API creates the first admin from `Seed:AdminEmail`/`Seed:AdminPassword` **only if no admin exists**.
4. Health check: `GET http://localhost:5259/api/health` → `{"status":"ok","students":<n>}` (also confirms DB connectivity).
5. In Development, the OpenAPI document is exposed (`app.MapOpenApi()`); it is **not** exposed in other environments.

### 5.2 Frontend
```bash
cd frontend
npm install                 # or: npm ci
cp .env.example .env        # Windows: copy .env.example .env
npm run dev                 # http://localhost:5173
```
`frontend/.env` values:

| Variable | Meaning | Local example |
| --- | --- | --- |
| `VITE_API_BASE_URL` | API base used by the browser | `/api` |
| `VITE_API_PROXY_TARGET` | Where the Vite dev proxy forwards `/api` | `http://localhost:5259` |

> `.env.example` defaults the proxy target to `https://localhost:5001`; make it match the profile you started (`http` profile → `http://localhost:5259`).

## 6. Production deployment

### 6.1 Build artifacts
```bash
# Backend
cd backend
dotnet publish -c Release -o ./publish

# Frontend
cd ../frontend
npm ci
npm run build              # output: frontend/dist/
```

### 6.2 Backend configuration (environment variables)
Never put real secrets in `appsettings.json` (it is committed and currently contains a development JWT key and `{user}/{password}` placeholders). Use environment variables (double underscore = nested key):

| Variable | Required | Description |
| --- | --- | --- |
| `ASPNETCORE_ENVIRONMENT` | yes | `Production` |
| `ConnectionStrings__Default` | **yes** | MySQL connection string. API refuses to start without it. |
| `Jwt__Key` | **yes** | Random secret, **≥ 32 characters**. API refuses to start otherwise. **Generate a new one for production.** |
| `Jwt__Issuer` / `Jwt__Audience` | yes | Defaults `SptApi` / `SptFrontend` |
| `Jwt__ExpireMinutes` | no | Default 480 |
| `App__FrontendUrl` | **yes** | Public URL of the site, e.g. `https://spt.example.edu`. Used in verification/reset links. |
| `Registration__ProfessorsNeedApproval` | no | `true` (default) = admin must activate new teachers |
| `Seed__AdminEmail`, `Seed__AdminPassword` | first run | Creates the first admin if none exists. Remove after first start and change the password. |
| `Seed__DemoData` | no | **Leave unset/false in production** |
| `ASPNETCORE_URLS` | no | e.g. `http://127.0.0.1:5000` when behind a reverse proxy |

Run the published API:
```bash
cd publish
dotnet SptApi.dll
```
Run it as a service (systemd, Windows Service/IIS, or a container) so it restarts automatically.

### 6.3 Frontend + routing (important)
The SPA calls the API at a **relative path** (`/api`) and the backend has **no CORS configuration**. The supported production layout is therefore **one public origin** where a web server/reverse proxy:
1. serves `frontend/dist/` as static files, **with fallback to `index.html`** for client-side routes (`/login`, `/studenthome`, …); and
2. forwards `/api/*` to the .NET API.

Example (nginx):
```nginx
server {
    listen 443 ssl;
    server_name spt.example.edu;

    root /var/www/spt/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location / {
        try_files $uri /index.html;
    }
}
```
If you instead host the frontend and API on **different domains**, you must (a) build the frontend with `VITE_API_BASE_URL=https://api.example.edu/api` and (b) add CORS to `backend/Program.cs`; this is not implemented today.

> `Program.cs` calls `UseHttpsRedirection()`. Behind a TLS-terminating proxy, either terminate HTTPS at the proxy and configure forwarded headers / HTTPS port, or serve the API over HTTPS directly; otherwise redirects may loop or fail.

### 6.4 Email (must be configured for production)
The API currently registers `ConsoleEmailSender`, which **prints emails to the server console instead of sending them**. Consequences in production:
- Self-registered users never receive the verification link, and sign-in requires a verified email.
- Password-reset links and admin-created temporary passwords are not delivered.

Before go-live, implement an `IEmailSender` (e.g. `SmtpEmailSender`) and register it in `backend/Program.cs` in place of `ConsoleEmailSender` (`builder.Services.AddSingleton<IEmailSender, …>()`). Until then, admins can create accounts and read credentials from the server log (not recommended beyond a demo).

### 6.5 Security checklist
- [ ] New random `Jwt__Key` set via environment; the committed key rotated/considered compromised.
- [ ] `Seed__DemoData` is **not** enabled; demo accounts (`admin@spt.local / admin123!`, `Password123`) do **not** exist.
- [ ] First admin password changed; `Seed__*` variables removed after first run.
- [ ] DB user has only the privileges in §4; MySQL not exposed to the internet.
- [ ] HTTPS enabled on the public site.
- [ ] `backend/appsettings.Development.json` and `frontend/.env` are never committed (both are in `.gitignore`).
- [ ] Regular MySQL backups configured (`mysqldump spt_db`).

## 7. Smoke test after deployment
1. `GET /api/health` returns `{"status":"ok", …}`.
2. Open the site root; the landing page loads; refresh on `/login` works (SPA fallback).
3. Admin signs in → **Admin Panel** loads.
4. Admin creates/activates the current term, a college → program → subject, and an offering.
5. Teacher/student account creation works and the email (or log entry) is produced.
6. Student: Prospectus request → Admin approves → Student selects schedule.
7. Teacher posts a grade → student sees it and receives a notification.
8. Admin: Reports generate, print and save as PDF; Audit Logs show the actions above.

## 8. Updating / rollback
- **Update:** `git pull`, rebuild backend and frontend (§6.1), restart the API, replace `dist/`.
- **Database changes:** apply new SQL as separate `ALTER` scripts (e.g. `05_remove_audit_ip.sql`). **Never re-run `01_schema.sql`** on a live database.
- **Rollback:** redeploy the previous published build and restore the latest DB backup if a schema change was applied.

## 9. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| API exits: "ConnectionStrings:Default is missing" | Set `ConnectionStrings__Default`. |
| API exits: "Jwt:Key is missing or shorter than 32 characters" | Set `Jwt__Key` to 32+ chars. |
| Login says "Unable to connect to the API" | API not running, wrong proxy target, or `/api` not proxied. |
| `/login` returns 404 on refresh | Web server lacks SPA fallback to `index.html`. |
| Browser CORS error | Frontend and API on different origins; use one origin (§6.3) or add CORS. |
| Verification emails never arrive | `ConsoleEmailSender` still in use (§6.4). |
| Students see "Enrollment is currently closed" | No active term; create/activate one. |
| "Duplicate column name 'schedule'" | You ran script 03 on a fresh schema; skip it. |
