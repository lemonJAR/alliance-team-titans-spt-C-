# Student Performance Tracker — Test Results Report

**Version:** 1.1
**Report date:** November 24, 2026
**Supersedes:** report dated May 13, 2026 (lint = FAIL, build = PENDING — both now out of date)

> **Honesty note.** Only the results marked **EXECUTED** below were actually run for this report. Items marked **NOT RUN** have a defined test case and expected result (derived from the source code) but still need a person to run them against a live API + MySQL and record PASS/FAIL. No result in this report has been assumed or invented.

---

## 1. Scope and environment

| Item | Value |
| --- | --- |
| System under test | Student Performance Tracker (frontend `frontend/`, API `backend/`, DB `database/`) |
| Source | `alliance-team-titans-spt-C-` repository snapshot (branch `develop`, last commit "Add student tracker defense guide") |
| Test machine (automated checks) | Linux sandbox, Node.js v22.23.5, npm 10.9.9 |
| Backend runtime for manual tests | .NET 9 SDK, MySQL 8 — **not available in the sandbox** |
| Automated test suites in repo | **None found** (no unit/integration test projects or spec files for frontend or backend; `backend/SptApi.http` is a request file, not a test suite) |

## 2. Summary

| Area | Result | Basis |
| --- | --- | --- |
| Frontend dependency install (`npm ci`) | **PASS** — EXECUTED | 199 packages installed |
| Frontend lint (`eslint .`) | **PASS** — EXECUTED | Exit code 0, no errors or warnings. *Previously FAIL (May 2026); the earlier lint errors have been resolved.* |
| Frontend production build (`npm run build`) | **PASS** — EXECUTED | 310 modules transformed, built in ~7 s, exit code 0 |
| Backend build (`dotnet build`) | **NOT RUN** | .NET SDK/NuGet not available in the test environment |
| Backend automated tests | **N/A** | No test project exists |
| Functional / UAT test cases (§5) | **NOT RUN** | Require running API + database |
| Security/config review (§6) | **EXECUTED (static review)** | 5 findings recorded |

## 3. Executed results (details)

### 3.1 Lint
```
npm run lint   →   eslint .   →   exit code 0 (no output)
```
Files that were failing in May 2026 (`AdminHome.jsx`, `StudentHome.jsx`, `TeacherHome.jsx`, `VerifyEmail.jsx`, `SignUp.jsx`) now pass.

### 3.2 Build
```
npm run build   →   vite build   →   ✓ 310 modules transformed, ✓ built in 7.19s (exit 0)
```

| Output | Size | Gzip |
| --- | --- | --- |
| `index-*.js` (main bundle) | 951.75 kB | 291.33 kB |
| `html2canvas-*.js` | 199.39 kB | 46.73 kB |
| `index.es-*.js` | 151.24 kB | 48.85 kB |
| `purify.es-*.js` | 29.02 kB | 11.45 kB |
| `index-*.css` | 20.02 kB | 4.40 kB |
| `Logo-*.png` | 388.19 kB | — |

**Warning (non-blocking):** the main bundle exceeds 500 kB after minification. Suggested improvement: code-split role dashboards with dynamic `import()` (`AdminHome.jsx` alone is ~3,700 lines).

## 4. Static findings (from code review)

| ID | Severity | Finding | Recommendation |
| --- | --- | --- | --- |
| F-1 | **High** | A JWT signing key is committed in `backend/appsettings.json`. | Treat as compromised; set a new `Jwt__Key` via environment variable in every deployment. |
| F-2 | **High (for production)** | Emails are not sent: `ConsoleEmailSender` only prints to console. Sign-in requires a verified email, so self-registered users cannot complete verification in production. | Implement and register an SMTP `IEmailSender` before go-live. |
| F-3 | Medium | No CORS policy; frontend relies on same-origin `/api` (dev proxy or reverse proxy). | Document/enforce single-origin hosting (done in Deployment Manual) or add CORS. |
| F-4 | Low | `database/03_offering_schedule_room.sql` fails on a fresh schema (columns already in `01_schema.sql`), yet `docs/DefenseGuide.md` §6 still lists it in the load order. | Update DefenseGuide §6 to skip script 03. |
| F-5 | Low | Seed term (2025-2026 Sem 1) has ended; a fresh install shows "Enrollment is currently closed" until the admin creates/activates a term. | Add a step to setup instructions (done in Deployment Manual §4). |

Also noted: session token is stored in `localStorage` and logout does not revoke the JWT server-side (accepted trade-off documented in `DefenseGuide.md`; deactivated users *are* blocked immediately).

## 5. Functional test cases (to be executed)

**How to run:** start MySQL (scripts 01 → 02 → 04), start the API with `Seed:DemoData=true`, run `npm run dev`, and use the demo accounts in User Manual §6. Record the result in the last column (PASS / FAIL / date / tester).

| ID | Area | Steps | Expected result | Result |
| --- | --- | --- | --- | --- |
| TC-01 | Health | `GET /api/health` | `200 {"status":"ok","students":N}` | NOT RUN |
| TC-02 | Sign-up (student) | Register with unclaimed ID `2025-0003`, valid password | 201; "Check your inbox" screen; verification link appears in API console | NOT RUN |
| TC-03 | Sign-up validation | Unknown student ID; duplicate email; password `abcdefgh` (no digit); mismatched confirm | Each rejected with the field message | NOT RUN |
| TC-04 | Email verification | Open link from TC-02, then reopen it | Verified; second open still succeeds ("Email verified") | NOT RUN |
| TC-05 | Sign-in gating | Sign in before verifying; with wrong password; as unapproved teacher | 403 verify email; 400 invalid; 403 not active | NOT RUN |
| TC-06 | Role routing | Sign in as admin / professor / student | Lands on `/adminhome` / `/teacherhome` / `/studenthome` | NOT RUN |
| TC-07 | Route protection | As student open `/adminhome` | Redirected; API calls to admin endpoints return 403 | NOT RUN |
| TC-08 | Forgot/reset password | Request reset, use link, reuse link after 1st use | Password changes; reused/expired link rejected | NOT RUN |
| TC-09 | Change password (student) | Wrong current password; then correct | Rejected; then success | NOT RUN |
| TC-10 | School setup | Admin adds college → program → subject → semester load | Records appear in lists | NOT RUN |
| TC-11 | Term management | Create term as active | Previous active term becomes inactive; only one active | NOT RUN |
| TC-12 | Create offering | Admin creates offering with schedule, room, 30 slots, teacher | Code like `IT101-<term>-01`; validation on empty schedule / slots 0 or 201 | NOT RUN |
| TC-13 | Enrollment request | Student requests subjects in own program/year/semester | Status PENDING; admin sees it in queue | NOT RUN |
| TC-14 | Enrollment rules | Request subject with unmet prerequisite; exceed unit limit; duplicate request | Rejected with per-subject error message | NOT RUN |
| TC-15 | Approve/reject | Admin approves one, rejects one | Student gets notification for each; rejected one can be re-requested | NOT RUN |
| TC-16 | Select schedule | Student selects section of approved subject; try a full section | Status ENROLLED, slot count +1; full section refused (409) | NOT RUN |
| TC-17 | Post grade | Teacher posts prelim/midterm/finals + remarks | Grade saved; student notified; history row created | NOT RUN |
| TC-18 | Grade validation | Enter 1.37, 0.75, 5.25, blank for all fields | Rejected (must be 1.00–5.00 in 0.25 steps; at least one grade) | NOT RUN |
| TC-19 | Update/delete grade | Teacher updates then deletes (double-click confirm) | History shows UPDATE/DELETE; audit entries created | NOT RUN |
| TC-20 | Teacher scope | Teacher tries another teacher's offering/student | 404 / not visible | NOT RUN |
| TC-21 | Past-term lock | Teacher edits grade in a non-active term; admin does the same | Teacher blocked ("locked"); admin allowed | NOT RUN |
| TC-22 | Student grades view | Open Grades tabs | GWA, Units Earned, Passed/Failed correct (pass = finals ≤ 3.00); timeline shows changes | NOT RUN |
| TC-23 | Student exports | Download CSV and PDF | Files download with correct data | NOT RUN |
| TC-24 | Admin grade override | Edit and delete a grade in Grade Overrides | Saved; history + audit entry | NOT RUN |
| TC-25 | People management | Create teacher and student; deactivate; activate; delete user with records | Temp-password account works; deactivated user blocked immediately; delete refused when records exist; cannot deactivate/delete self | NOT RUN |
| TC-26 | Reports | Generate with filters; export PDF, CSV, Excel; Print | Summary counts (total/graded/passing/failing) match table; files open | NOT RUN |
| TC-27 | Audit logs | Filter by action, actor type, ID, email | Logins, grade changes, enrollment actions listed and filterable | NOT RUN |
| TC-28 | Notifications | Student/Admin bell, Mark all read, View all | Unread count updates | NOT RUN |
| TC-29 | Session expiry | Delete/expire token; call any page | Redirected to `/login` | NOT RUN |
| TC-30 | Production build run | Serve `dist/` behind reverse proxy per Deployment Manual §6.3, refresh `/login` | Page loads; login works | NOT RUN |

**Totals:** 30 defined · 0 executed · 30 NOT RUN.

## 6. Defects
No functional defects have been recorded because functional tests have not yet been executed. Findings F-1 to F-5 (§4) are configuration/documentation issues found by review.

## 7. Conclusion and next actions
- The frontend is **build-clean and lint-clean** (improvement since May 2026).
- The backend and end-to-end behaviour are **unverified in this report**.
- To complete this report: (1) run `dotnet build` and note result; (2) execute TC-01…TC-30 and fill the Result column; (3) log any defects with IDs; (4) re-issue with tester name and sign-off.
- Recommended: add automated tests (xUnit for `GradeRules`/`PasswordRules` and controllers; Vitest/React Testing Library for the frontend).

| Prepared by | Reviewed by | Date |
| --- | --- | --- |
| ______________ | ______________ | ______________ |
