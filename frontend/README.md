# Student Performance Tracker frontend

This is a React/Vite client for the ASP.NET Core Student Performance Tracker
API.

## Setup

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Configure `VITE_API_BASE_URL` in `.env`. The default is
`https://localhost:5001/api`.

In development, the login form also accepts these temporary local demo
accounts:

- `student@example.com` / `Student123!`
- `professor@example.com` / `Professor123!`
- `admin@example.com` / `Admin123!`

Demo accounts are disabled in production builds and must not be used as real
credentials.

## Faculty CSV import

Administrators can bulk-create faculty accounts from the **Add Teacher** page.
Upload a prepared CSV containing these columns:

```csv
first_name,last_name,middle_name,email,employee_id,department_code
Juan,Dela Cruz,,juan.delacruz@example.com,EMP-001,SCS
```

The browser validates required fields, email format, duplicate rows, and
department codes before showing a preview. Only valid rows are submitted after
the administrator confirms the import. Temporary credentials are generated
and emailed by the API for each created account; discipline assignments remain
a separate step.

## Validation

```powershell
npm run lint
npm run build
```
