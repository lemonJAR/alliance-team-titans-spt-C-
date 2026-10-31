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

## Validation

```powershell
npm run lint
npm run build
```
