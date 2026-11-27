# SPT Mock Defense Guide — File & Code Tracing

Links open the exact file and line in VS Code (Ctrl+Click in the editor, or click in Markdown Preview).

> **Out of date after the post-mock-defense refactor.** The backend now follows Controller → Service → Repository, so logic that used to live in the controllers is now in `backend/Services/` and database access is in `backend/Repositories/`. Many file and line links below point to the old layout. CSV/Excel export and manual employee/student IDs have also been removed. Use [Architecture.md](Architecture.md) for the current structure.

---

## 0. The 30-second pitch

> "The Student Performance Tracker is a three-tier web app. The **frontend is React + Vite**, kept from our first version. We **rewrote the backend from Django to ASP.NET Core (.NET 9, C#)**, using **Entity Framework Core with the Pomelo MySQL provider** against the **same MySQL schema** we already had. Login uses **JWT tokens** signed with HMAC-SHA256, passwords are hashed with **BCrypt**, and every role check is done **on the server**. Every change to a grade is recorded twice: in `grade_history` (per grade timeline) and in `audit_logs` (system-wide)."

### Why the frontend didn't need to change much (likely question)
We kept the **same API contract** that Django REST Framework used:

| What the React app expected from Django | How the C# backend matches it | Where |
|---|---|---|
| snake_case JSON (`first_name`) | Global JSON policy `SnakeCaseLower` | [Program.cs:66-72](../backend/Program.cs#L66-L72) |
| Same URLs (`/api/auth/...`, `/api/system/...`) | `[Route("api/auth")]`, `[Route("api/system/grades")]` etc. | each controller's `[Route]` |
| Trailing slashes (`/auth/login/`) | ASP.NET routing ignores the trailing slash | [api.jsx:42-148](../frontend/src/services/api.jsx#L42-L148) |
| DRF-style errors `{ field: ["msg"] }` and `{ detail: "msg" }` | Controllers build `Dictionary<string,string[]>` / `new { detail = ... }` | e.g. [AccountController.cs:58-79](../backend/Controllers/AccountController.cs#L58-L79) |
| Bearer token in header | Axios interceptor adds `Authorization: Bearer` | [api.jsx:22-28](../frontend/src/services/api.jsx#L22-L28) |
| Dates readable by the browser | `UtcDateTimeConverter` adds the `Z` | [UtcDateTimeConverter.cs](../backend/Services/UtcDateTimeConverter.cs) |

---

## 1. Architecture & request lifecycle (trace ANY feature with this)

```
Page (pages/*.jsx)
  → controller re-export (controllers/*.js)        ← thin MVC-style layer, just re-exports api calls
  → services/api.jsx  (axios + interceptors)
  → Vite dev proxy /api → https://localhost:5001   (vite.config.js)
  → Program.cs pipeline: HTTPS → UseAuthentication (JWT) → UseAuthorization ([Authorize(Roles)])
  → Controller action (backend/Controllers/*.cs)
  → SptDbContext (EF Core LINQ → SQL) → MySQL spt_db
  → AuditService.LogAsync → audit_logs
  ← JSON (snake_case) back to the page
```

### Folder map

| Layer | Folder / file | Purpose |
|---|---|---|
| DB | [database/01_schema.sql](../database/01_schema.sql) | 17 tables, FKs, CHECK constraints (retained from Django version) |
| DB | [database/02_seed.sql](../database/02_seed.sql), [04_demo_seed.sql](../database/04_demo_seed.sql) | seed / demo data |
| Backend entry | [backend/Program.cs](../backend/Program.cs) | DI registration, JWT config, JSON options, middleware order, seeding |
| Backend config | [backend/appsettings.json](../backend/appsettings.json) | connection string, JWT issuer/audience/expiry, frontend URL |
| Data | [backend/Data/SptDbContext.cs](../backend/Data/SptDbContext.cs) | EF Core mapping of every table (scaffolded "database-first" from the existing SQL) |
| Models | [backend/Models/](../backend/Models/) | one C# class per table (`User`, `Grade`, `GradeHistory`, `Enrollment`...) |
| Services | [backend/Services/](../backend/Services/) | `TokenService` (JWT), `AuditService`, `EmailTokenService`, `GradeRules`, `PasswordRules`, `Roles`, `CsvText` |
| Controllers | [backend/Controllers/](../backend/Controllers/) | the REST endpoints |
| Frontend routing | [frontend/src/App.jsx](../frontend/src/App.jsx), [routes/ProtectedRoute.jsx](../frontend/src/routes/ProtectedRoute.jsx) | URL → page, role guard |
| Frontend session | [frontend/src/models/authSession.js](../frontend/src/models/authSession.js) | token + user in `localStorage` |
| Frontend API | [frontend/src/services/api.jsx](../frontend/src/services/api.jsx) | every HTTP call in one file |
| Pages | [pages/StudentHome.jsx](../frontend/src/pages/StudentHome.jsx), [TeacherHome.jsx](../frontend/src/pages/TeacherHome.jsx), [AdminHome.jsx](../frontend/src/pages/AdminHome.jsx) | the three dashboards |

### Program.cs walkthrough (they WILL ask you to open this)

| Lines | What it does | What to say |
|---|---|---|
| [11-16](../backend/Program.cs#L11-L16) | Reads `ConnectionStrings:Default`, registers `SptDbContext` with `UseMySql` | "EF Core + Pomelo connects to MySQL; fails fast if missing." |
| [19-23](../backend/Program.cs#L19-L23) | Dependency Injection: `AddScoped<TokenService>` etc. | "Scoped = one instance per HTTP request. Email sender is Singleton." |
| [26-28](../backend/Program.cs#L26-L28) | Refuses to start if JWT key < 32 chars | HMAC-SHA256 needs a 256-bit key. |
| [36-48](../backend/Program.cs#L36-L48) | `OnTokenValidated`: re-checks `users.is_active` in DB on every request | "A deactivated user is locked out immediately, not when the token expires." |
| [49-61](../backend/Program.cs#L49-L61) | Validates issuer, audience, signature, lifetime; `RoleClaimType = "role"` | This is what makes `[Authorize(Roles = "ADMIN")]` work. |
| [66-72](../backend/Program.cs#L66-L72) | snake_case JSON + UTC converters | Keeps compatibility with the React app. |
| [82-85](../backend/Program.cs#L82-L85) | `UseAuthentication` **before** `UseAuthorization` | Order matters: identify first, then check permissions. |
| [87-92](../backend/Program.cs#L87-L92) | Seeds first admin; demo data only if `Seed:DemoData` is true | |

---

## 2. WBS → Code trace (in WBS order)

### 1.0 Documentation (Project Plan, WBS, HLD)
- [docs/Documentation.md](Documentation.md), [UserManual.md](UserManual.md), [DeploymentManual.md](DeploymentManual.md), [TestResultsReport.md](TestResultsReport.md)
- HLD = Section 1 above (React → ASP.NET Core Web API → EF Core → MySQL).

---

### 6.0 Login / Logout / Clear Fields

**Login — full trace**

1. User types email + password → [Login.jsx:7-18](../frontend/src/pages/Login.jsx#L7-L18) state `form`, `set()` updates a field **and clears that field's error**.
2. Client validation → [Login.jsx:20-30](../frontend/src/pages/Login.jsx#L20-L30) (required, email regex).
3. Submit → [Login.jsx:32-44](../frontend/src/pages/Login.jsx#L32-L44) calls `signIn(form)` → [authController.js](../frontend/src/controllers/authController.js) → `login()` in [api.jsx:44-51](../frontend/src/services/api.jsx#L44-L51) → `POST /api/auth/login/`.
4. Backend → [AuthController.cs:28-59](../backend/Controllers/AuthController.cs#L28-L59)
   - L32: email trimmed + lowercased
   - L35-38: EF query `Users.Include(Student).Include(Teacher)`
   - L42: `BCrypt.Verify(password, user.PasswordHash)` — **we never store or compare plain passwords**
   - L40-46: same message for wrong email/wrong password (prevents account enumeration); returns **400 not 401** because the frontend logs out on any 401
   - L44: failed attempt written to audit log as `LOGIN_FAILED`
   - L49-53: blocks inactive (pending professor / deactivated) and unverified email → 403
   - L58: returns `{ token, user }`; token built by [Tokenservice.cs:11-32](../backend/Services/Tokenservice.cs#L11-L32) (claims `sub`, `email`, `role`, `name`; HS256; expires after `Jwt:ExpireMinutes` = 480 min)
5. Frontend stores session → [authSession.js:22-26](../frontend/src/models/authSession.js#L22-L26) (`localStorage`).
6. Redirect by role → [Login.jsx:38-43](../frontend/src/pages/Login.jsx#L38-L43).

**Logout — full trace**
- Button in sidebar → [DashboardLayout.jsx:62](../frontend/src/components/DashboardLayout.jsx#L62) → `handleLogout` e.g. [AdminHome.jsx:3670-3678](../frontend/src/pages/AdminHome.jsx#L3670-L3678) → `signOut()` [authController.js](../frontend/src/controllers/authController.js) → `POST /api/auth/logout/` → [AuthController.cs:61-70](../backend/Controllers/AuthController.cs#L61-L70) logs `LOGOUT` → `finally { clearSession() }` removes token from localStorage.
- **Say:** "JWT is stateless, so logout = deleting the token on the client. The server endpoint just records it in the audit log. `finally` guarantees the token is cleared even if the server is down."

**Clear Fields**
- Login: typing in a field clears its error ([Login.jsx:15-18](../frontend/src/pages/Login.jsx#L15-L18)); form starts from `initialForm` ([Login.jsx:7](../frontend/src/pages/Login.jsx#L7)); SignUp also uses `initialForm` ([SignUp.jsx:6](../frontend/src/pages/SignUp.jsx#L6)).
- Audit Log "Clear filters" button → `clearFilters` resets state ([AdminHome.jsx:3443](../frontend/src/pages/AdminHome.jsx#L3443), button at [3565](../frontend/src/pages/AdminHome.jsx#L3565)).
- ⚠ Be honest if asked: there's no dedicated "Clear" button on the login form itself; field clearing is done through the state reset/error-clear above.

**Session expiry / auto-logout:** [api.jsx:30-39](../frontend/src/services/api.jsx#L30-L39) — any 401 → `clearSession()` and redirect to `/login`.

---

### 7.0 Forgot Password
1. [ForgotPassword.jsx:12-16](../frontend/src/pages/ForgotPassword.jsx#L12-L16) → `requestPasswordReset(email)` → `POST /api/auth/password/forgot/`
2. [AccountController.cs:188-211](../backend/Controllers/AccountController.cs#L188-L211)
   - L200: `tokens.IssueAsync(..., Reset, 1 hour)` → [Emailtokenservice.cs:22-39](../backend/Services/Emailtokenservice.cs#L22-L39): 32 random bytes (`RandomNumberGenerator`), **only the SHA-256 hash is stored** in `email_tokens`, older unused tokens are cancelled.
   - L201-203: email with link `/reset-password/{raw}`.
   - L210: **same response whether or not the email exists** (no user enumeration).
3. Email: [IEmailSender.cs:10-24](../backend/Services/IEmailSender.cs#L10-L24) `ConsoleEmailSender` **prints the email in the backend terminal** (dev mode). ⚠ For the demo, copy the link from the `dotnet run` console.
4. User opens link → route `/reset-password/:token` [App.jsx](../frontend/src/App.jsx) → [ResetPassword.jsx:18-28](../frontend/src/pages/ResetPassword.jsx#L18-L28) → `POST /api/auth/password/reset/` → [AccountController.cs:213-232](../backend/Controllers/AccountController.cs#L213-L232): validates password rules, `FindValidAsync` (unused + not expired), re-hashes with BCrypt, marks token used.

### 8.0 Change Password
- Student Profile tab: [StudentHome.jsx:111-116](../frontend/src/pages/StudentHome.jsx#L111-L116) → `POST /api/auth/password/change/`
- [AccountController.cs:234-260](../backend/Controllers/AccountController.cs#L234-L260): `[Authorize]`; verifies current password with BCrypt (L245); new password must pass [PasswordRules.cs](../backend/Services/PasswordRules.cs) (≥8 chars, letter + digit, ≤72 bytes because BCrypt ignores the rest) and differ from the old one (L250); audit `PASSWORD_CHANGE`.

### 9.0 Role-Based Access Control (MOST LIKELY DEEP-DIVE)
Three layers — say all three:

| Layer | Where | How |
|---|---|---|
| 1. Frontend route guard | [ProtectedRoute.jsx](../frontend/src/routes/ProtectedRoute.jsx), used in [App.jsx](../frontend/src/App.jsx) (`allowedRoles={[ROLES.ADMIN]}` ...) | No session → `/login`; wrong role → redirected to own dashboard via [roles.js](../frontend/src/models/roles.js) |
| 2. Backend endpoint authorization | `[Authorize(Roles = Roles.Admin)]` e.g. [AdminController.cs:49](../backend/Controllers/AdminController.cs#L49), [ReportsController.cs:20](../backend/Controllers/ReportsController.cs#L20), [GradesController.cs:26](../backend/Controllers/GradesController.cs#L26) (`StaffRoles = "PROFESSOR,ADMIN"`) | Role comes from the **signed** JWT `role` claim — user can't edit it without breaking the signature. Roles constants: [Roles.cs](../backend/Services/Roles.cs) |
| 3. Row-level (data ownership) | [GradesController.cs:335-353](../backend/Controllers/GradesController.cs#L335-L353) `CanManage`, `CanRead`, `TermIsOpenForEditing`; [GradesController.cs:58-63](../backend/Controllers/GradesController.cs#L58-L63) professor list filter | A professor can only touch grades in **their own** offerings; student only reads own. Returns 404 (not 403) so other teachers' classes aren't revealed. |

- **Say:** "The frontend guard is only for user experience. Security is enforced in the API — even if someone edits localStorage to say ADMIN, the server reads the role from the signed token."
- Plus: `OnTokenValidated` checks `is_active` on every request ([Program.cs:38-47](../backend/Program.cs#L38-L47)).
- Professor self-registration needs admin approval: [AccountController.cs:107-119](../backend/Controllers/AccountController.cs#L107-L119) (`IsActive = false` until approved).

---

### 10.0 Add/Update Grades (Professor — TeacherHome)

**Loading the class**
- [TeacherHome.jsx:47-49](../frontend/src/pages/TeacherHome.jsx#L47-L49) `fetchTeacherOfferings` → `GET /api/system/teacher/offerings/` → [OfferingsController.cs:132-145](../backend/Controllers/OfferingsController.cs#L132-L145) (only `o.TeacherId == teacher.Id`, active term).
- Click a section → [TeacherHome.jsx:81-120](../frontend/src/pages/TeacherHome.jsx#L81-L120) `selectOffering` runs **two calls in parallel** (`Promise.all`): enrolled students ([OfferingsController.cs:147-173](../backend/Controllers/OfferingsController.cs#L147-L173), ownership check L155-156) + existing grades (`GET /api/system/grades/?offering=`). Merged with a `Map` keyed by student id → each row knows its `grade_id` or `null`.

#### 11.0 Add Grade Entry
1. Client validation [TeacherHome.jsx:122-140](../frontend/src/pages/TeacherHome.jsx#L122-L140): at least one grade, 1.00–5.00, steps of 0.25.
2. [TeacherHome.jsx:142-174](../frontend/src/pages/TeacherHome.jsx#L142-L174) `handleSubmitGrade`: `row.grade_id` null → `submitGrade` (POST), else `updateGrade` (PATCH).
3. `POST /api/system/grades/` → [GradesController.cs:174-240](../backend/Controllers/GradesController.cs#L174-L240)
   - L190: `ReadGradeValues` → [GradeRules.cs](../backend/Services/GradeRules.cs) (1.00–5.00, quarter steps)
   - L197-202: finds the enrollment (student + subject + term)
   - L204: must be `ENROLLED`
   - L208: `CanManage` → must be the professor's own section
   - L210: `TermIsOpenForEditing` → past terms locked for professors
   - L213: one grade per enrollment → 409 Conflict
   - L216-232: **DB transaction**: insert `grades` + insert `grade_history` (`CREATE`) → commit (all or nothing)
   - L234: audit `GRADE_CREATE`; L236: notification to the student

**Grade validation has 3 layers:** frontend `validateRow` → backend `GradeRules` → MySQL `CHECK (finals BETWEEN 1.00 AND 5.00)` in [01_schema.sql](../database/01_schema.sql) (grades table).

#### 12.0 Edit/Update Grade Entry
- `PATCH /api/system/grades/{id}/` → [GradesController.cs:242-285](../backend/Controllers/GradesController.cs#L242-L285)
  - Uses `JsonObject` body so it can tell "field missing" (don't change) from "field = null" (clear it) — see [458-502](../backend/Controllers/GradesController.cs#L458-L502).
  - L261 / L271: `Snapshot` before & after as JSON; L272 no-op if nothing changed (`Norm` makes 1.5 == 1.50, L389-392).
  - L274-278: transaction → `grade_history` `UPDATE` row with old + new values.
  - L280 audit `GRADE_UPDATE`, L282 notify student.

#### 13.0 Delete Grade Entry
- Two-click confirm on frontend: [TeacherHome.jsx:176-188](../frontend/src/pages/TeacherHome.jsx#L176-L188) (first click shows "Confirm?").
- `DELETE` → [GradesController.cs:287-310](../backend/Controllers/GradesController.cs#L287-L310): history row `DELETE` saved **before** removal; `grade_history` has no FK to `grades`, so the trail survives the delete.

#### 14.0 View Grade Entry Lists
- Teacher: the table built in `selectOffering`. Admin: Grade Overrides tab [AdminHome.jsx:2604-2650](../frontend/src/pages/AdminHome.jsx#L2604-L2650) → `GET /api/system/grades/?student=&term=&subject=&period=` → [GradesController.cs:48-84](../backend/Controllers/GradesController.cs#L48-L84) (dynamic LINQ filters, `period` switch L70-75, capped at 2000 rows).

#### 15.0 Feedback/Remarks per Grade
- Column `grades.remarks VARCHAR(500)` ("teacher feedback per grade") in [01_schema.sql](../database/01_schema.sql).
- Input: [TeacherHome.jsx:310-312](../frontend/src/pages/TeacherHome.jsx#L310-L312); sent in payload L156.
- Backend: [GradesController.cs:466-476](../backend/Controllers/GradesController.cs#L466-L476) `ReadRemarks` (trim, must be text, ≤500 chars).

---

### 16.0 View Grades (Student — StudentHome Grades tab)

#### 17.0 Student Grade Dashboard
- [StudentHome.jsx:533-556](../frontend/src/pages/StudentHome.jsx#L533-L556) loads `getMyGrades()` + `getMyProspectus()` in parallel.
- `GET /api/system/grades/mine/` → [GradesController.cs:30-46](../backend/Controllers/GradesController.cs#L30-L46): `[Authorize(Roles = Student)]`, finds the student from the JWT `sub` (L329-333) — **student can't request another student's grades; there's no id parameter.**
- **GWA** computed client-side: [StudentHome.jsx:638-646](../frontend/src/pages/StudentHome.jsx#L638-L646) = Σ(finals × units) / Σ(units) — a units-weighted average. Color scale `gradeColor` L648-655.

#### 18.0 Grade Details per Subject
- Grouping by "Year X - Sem Y": [StudentHome.jsx:566-575](../frontend/src/pages/StudentHome.jsx#L566-L575); per-subject prelim/midterm/finals/remarks rows around [StudentHome.jsx:900](../frontend/src/pages/StudentHome.jsx#L900) and per-term GWA around [967](../frontend/src/pages/StudentHome.jsx#L967).
- DTO with all subject fields: [GradesController.cs:394-424](../backend/Controllers/GradesController.cs#L394-L424).

#### 19.0 View Feedback/Remarks
- Remarks column [StudentHome.jsx:900](../frontend/src/pages/StudentHome.jsx#L900), [1154](../frontend/src/pages/StudentHome.jsx#L1154); timeline shows `item.current.remarks` [1204-1206](../frontend/src/pages/StudentHome.jsx#L1204-L1206).

#### 20.0 Grade History / Timeline
- [StudentHome.jsx:559-563](../frontend/src/pages/StudentHome.jsx#L559-L563) `fetchGradeTimeline()` → `GET /api/system/grades/timeline/` → [GradesController.cs:107-138](../backend/Controllers/GradesController.cs#L107-L138): scope depends on role (admin = all, professor = own sections, student = own grades), newest first, max 200.
- `ToHistoryDtos` [426-449](../backend/Controllers/GradesController.cs#L426-L449) resolves `changed_by` → name and parses old/new JSON.
- Per-grade history: `GET /api/system/grades/{id}/history/` [86-105](../backend/Controllers/GradesController.cs#L86-L105).

---

### 21.0 Generate Report (Admin — Reports tab)

#### 22.0 Search/Filter Report Parameters
- Filters state: [AdminHome.jsx:3103](../frontend/src/pages/AdminHome.jsx#L3103) `{ term, program, year_level, student, subject }`; inputs at [3272-3332](../frontend/src/pages/AdminHome.jsx#L3272-L3332).
- Backend `Filtered()` [ReportsController.cs:131-157](../backend/Controllers/ReportsController.cs#L131-L157): only `ENROLLED`, each filter adds a `.Where` (IQueryable is built up, executed once in SQL). `student` accepts ID number **or** DB id; `subject` accepts code or id.

#### 23.0 Generate Grade Summary Report
- `loadReport` [AdminHome.jsx:3111-3114](../frontend/src/pages/AdminHome.jsx#L3111-L3114) → `GET /api/system/reports/grades/` → [ReportsController.cs:26-49](../backend/Controllers/ReportsController.cs#L26-L49)
  - Summary counts done **in the database** (`CountAsync`): total, graded, passing (finals ≤ 3.00), failing = graded − passing.
  - Rows capped at 5000, `truncated` flag tells the UI.

#### 24.0 Export to PDF
- **Client-side** with `jsPDF` + `jspdf-autotable`: [AdminHome.jsx:3204-3240](../frontend/src/pages/AdminHome.jsx#L3204-L3240) (uses the already-generated report; must click Generate first).
- Student's own PDF: [StudentHome.jsx:678](../frontend/src/pages/StudentHome.jsx#L678) `handleExportPdf`.

#### 25.0 Export to Excel
- `exportGradeReportExcel` (`responseType: 'blob'`) [AdminHome.jsx:3192-3202](../frontend/src/pages/AdminHome.jsx#L3192-L3202) → `GET .../export-xlsx/` → [ReportsController.cs:81-127](../backend/Controllers/ReportsController.cs#L81-L127) using **ClosedXML**: bold header, frozen top row, grades as real numbers (`SetGrade` L189-194) so Excel can sort/average.
- CSV too: [ReportsController.cs:51-79](../backend/Controllers/ReportsController.cs#L51-L79) (UTF-8 BOM so Excel shows accented names).
- **Security point:** [CsvText.cs](../backend/Services/CsvText.cs) `Defuse` — prefixes `'` to cells starting with `= + - @` (prevents **CSV/formula injection** from teacher-typed remarks).
- Frontend download trick: Blob → `createObjectURL` → hidden `<a download>` → click → revoke.

#### 26.0 Print Report
- [AdminHome.jsx:3116-3178](../frontend/src/pages/AdminHome.jsx#L3116-L3178) `handlePrint`: opens a new window, writes an HTML table of the report, runs `window.print()` on load then closes. Warns if popups are blocked.

---

### 27.0 Admin Manage Users/Grades

#### 28.0 List/Search Users
- [AdminHome.jsx:2245-2290](../frontend/src/pages/AdminHome.jsx#L2245-L2290) `UserManagementTab`: `reloadUsers` fetches teachers + students in parallel; search is a **client-side filter** (`search` state, `matches`, `filteredTeachers/filteredStudents`).
- Backend: [AdminController.cs:59-87](../backend/Controllers/AdminController.cs#L59-L87) teachers, [163-190](../backend/Controllers/AdminController.cs#L163-L190) students (`registered = false` = registrar-preloaded ID nobody signed up with yet).

#### 29.0 Add New User (Student/Teacher)
- Teacher: [AdminHome.jsx:611-625](../frontend/src/pages/AdminHome.jsx#L611-L625) → [AdminController.cs:89-139](../backend/Controllers/AdminController.cs#L89-L139); Student: [AdminHome.jsx:934-948](../frontend/src/pages/AdminHome.jsx#L934-L948) → [AdminController.cs:212-268](../backend/Controllers/AdminController.cs#L212-L268).
- Generates a 12-char temp password with a **cryptographic RNG** ([386-397](../backend/Controllers/AdminController.cs#L386-L397)), BCrypt-hashes it, `EmailVerified = true` (admin vouches), emails credentials.
- **Bulk CSV import** for both: [AdminHome.jsx:627-690](../frontend/src/pages/AdminHome.jsx#L627-L690) (teachers), [950-1020](../frontend/src/pages/AdminHome.jsx#L950-L1020) (students) — loops the same create endpoint.
- Self sign-up path: [SignUp.jsx:50-67](../frontend/src/pages/SignUp.jsx#L50-L67) → `verify-student` + `register` → [AccountController.cs:42-137](../backend/Controllers/AccountController.cs#L42-L137) (student ID must be pre-loaded by registrar; email verification link).

#### 30.0 Edit/Update User Information
- `editUser` / `saveEditingUser` [AdminHome.jsx:2299-2338](../frontend/src/pages/AdminHome.jsx#L2299-L2338) → `PATCH /api/auth/admin/users/{id}/` → [AdminController.cs:272-299](../backend/Controllers/AdminController.cs#L272-L299): only changed fields are applied, list of changes goes into the audit log. Also used to **approve a pending professor** (`is_active: true`).
- Teacher subject assignment: [AdminController.cs:141-159](../backend/Controllers/AdminController.cs#L141-L159).

#### 31.0 Delete/Deactivate User
- Deactivate toggle: `toggleActive` [AdminHome.jsx:2290-2297](../frontend/src/pages/AdminHome.jsx#L2290-L2297) → same PATCH with `is_active` (can't deactivate yourself, L279-280). Takes effect on the **next request** because of `OnTokenValidated`.
- Delete: [AdminHome.jsx:2340-2348](../frontend/src/pages/AdminHome.jsx#L2340-L2348) → [AdminController.cs:301-334](../backend/Controllers/AdminController.cs#L301-L334): refuses (409) if the user has grades, enrollments or classes — "deactivate instead", so academic records are never lost. Can't delete self or admins.
- FK behavior in SQL: `students.user_id ON DELETE SET NULL` (student ID record stays), `teachers.user_id ON DELETE CASCADE`.

#### 32.0 Override/Manage Any Grade Entry
- Admin "Grade Overrides" tab [AdminHome.jsx:2587-2710](../frontend/src/pages/AdminHome.jsx#L2587-L2710): filter → edit inline → **preview modal** (`handlePreview` / `confirmPreviewSave`) → `updateGrade`; delete with confirm dialog.
- Backend: same `GradesController` endpoints. Admin bypass is in two lines: `CanManage` returns true for admin ([GradesController.cs:338](../backend/Controllers/GradesController.cs#L338)) and `TermIsOpenForEditing` ([353](../backend/Controllers/GradesController.cs#L353)) lets admin edit **past/locked terms**. Still writes `grade_history` + audit, so overrides are traceable.

#### 33.0 Audit Log / Modification History
- Writer: [Auditservice.cs](../backend/Services/Auditservice.cs) — reads actor id/email/role from the JWT claims, records IP and UTC time. Wrapped in try/catch so an audit failure never breaks a request that already saved.
- Actions logged: `LOGIN`, `LOGIN_FAILED`, `LOGOUT`, `REGISTER`, `EMAIL_VERIFIED`, `PASSWORD_*`, `GRADE_CREATE/UPDATE/DELETE`, `TEACHER_CREATE`, `STUDENT_CREATE`, `USER_UPDATE`, `USER_DELETE`, `ENROLLMENT_*`, `REPORT_EXPORT`...
- Reader: [AuditLogTab AdminHome.jsx:3385-3410](../frontend/src/pages/AdminHome.jsx#L3385-L3410) → `GET /api/auth/admin/audit-logs/` → [AdminController.cs:336-378](../backend/Controllers/AdminController.cs#L336-L378): filter by action, actor type, email, or **student/employee ID** (translated to user ids, L354-361); newest 500.
- Table + indexes: `audit_logs` in [01_schema.sql](../database/01_schema.sql) (indexes on action, actor, date).

---

## 3. Supporting modules (not on the WBS screenshot but they may click around)

| Feature | Frontend | Backend |
|---|---|---|
| Email verification | [VerifyEmail.jsx:22](../frontend/src/pages/VerifyEmail.jsx#L22) | [AccountController.cs:141-166](../backend/Controllers/AccountController.cs#L141-L166) |
| Student enrollment request (prereqs, unit load) | `ProspectusTab` [StudentHome.jsx:195-240](../frontend/src/pages/StudentHome.jsx#L195-L240) | [EnrollmentController.cs:84-175](../backend/Controllers/EnrollmentController.cs#L84-L175) |
| Pick schedule (slot race-condition safe) | `EnrollmentTab` [StudentHome.jsx:365-400](../frontend/src/pages/StudentHome.jsx#L365-L400) | [EnrollmentController.cs:220-270](../backend/Controllers/EnrollmentController.cs#L220-L270) — atomic `UPDATE ... WHERE current_slots < max_slots` |
| Admin approve/reject queue | `ApprovalQueue` [AdminHome.jsx:1429-1490](../frontend/src/pages/AdminHome.jsx#L1429-L1490) | [EnrollmentController.cs:273-345](../backend/Controllers/EnrollmentController.cs#L273-L345) |
| School setup (college/program/subject/load) | `SchoolTab` [AdminHome.jsx:165-240](../frontend/src/pages/AdminHome.jsx#L165-L240) | [SetupController.cs](../backend/Controllers/SetupController.cs) |
| Terms / offerings | `OfferingsTab` [AdminHome.jsx:1782](../frontend/src/pages/AdminHome.jsx#L1782) | [TermsController.cs](../backend/Controllers/TermsController.cs), [OfferingsController.cs](../backend/Controllers/OfferingsController.cs) |
| Notifications | `NotificationBell`, [StudentHome.jsx:1269-1270](../frontend/src/pages/StudentHome.jsx#L1269-L1270) | [NotificationsController.cs](../backend/Controllers/NotificationsController.cs) |
| Health check | — | `GET /api/health` [HealthController.cs](../backend/Controllers/HealthController.cs) |

Grade lifecycle in one line: **enrollment request (PENDING) → admin APPROVED → student picks section (ENROLLED) → professor posts grade → history + audit + notification → student sees it → admin can override.**

---

## 4. Likely panel questions & answers

**Q: Why switch from Django to .NET?**
A: Course requirement / team stack (C#); strongly-typed models catch errors at compile time; EF Core LINQ queries; ASP.NET Core's built-in JWT auth and DI. We kept the database and the API contract, so the React app and the data survived the migration.

**Q: How did you reuse the SQL with EF Core?**
A: Database-first — the models and `SptDbContext` were scaffolded from the existing MySQL schema (that's why the classes are `partial` and `SptDbContext.Extras.cs` / `Offering.Extras.cs` hold our additions without touching generated code).

**Q: Is there SQL injection risk?**
A: No raw SQL string concatenation. All queries are EF Core LINQ → parameterized SQL.

**Q: How are passwords stored?**
A: BCrypt hash (salted, slow by design) — `BCrypt.HashPassword` / `BCrypt.Verify`. Reset/verification tokens are stored as SHA-256 hashes, never raw.

**Q: What stops a student from calling the admin API directly (Postman)?**
A: `[Authorize(Roles = "ADMIN")]` on the controller. The role is inside the signed JWT; changing it invalidates the signature → 401. Show [AdminController.cs:49](../backend/Controllers/AdminController.cs#L49).

**Q: What stops a professor from editing another professor's grades?**
A: `CanManage` checks `enrollment.Offering.TeacherId == currentTeacher.Id` ([GradesController.cs:336-342](../backend/Controllers/GradesController.cs#L336-L342)). Returns 404 so they can't even confirm the grade exists.

**Q: What happens if two writes fail halfway?**
A: Grade + history are saved inside `BeginTransactionAsync` / `CommitAsync`; if anything throws before commit, it's rolled back.

**Q: What's the difference between grade_history and audit_logs?**
A: `grade_history` = per-grade before/after JSON for the student timeline. `audit_logs` = system-wide "who did what, when, from which IP" for every module.

**Q: What is the passing grade / scale?**
A: Philippine scale 1.00 (best) – 5.00 (fail), passing ≤ 3.00, quarter steps. One place: [GradeRules.cs](../backend/Services/GradeRules.cs).

**Q: Why is login failure a 400 instead of 401?**
A: The axios interceptor treats every 401 as "session expired" and redirects. A wrong password isn't an expired session. (Comment at [AuthController.cs:40-41](../backend/Controllers/AuthController.cs#L40-L41).)

**Q: Where do the PDFs come from?**
A: PDF is generated in the browser (jsPDF + autoTable). CSV and Excel are generated on the server (StringBuilder / ClosedXML) and downloaded as blobs.

---

## 5. Weak spots — know these before they find them

| Issue | Honest answer |
|---|---|
| JWT signing key is committed in [appsettings.json:19](../backend/appsettings.json#L19) | "For development only. In deployment it's overridden by the `Jwt__Key` environment variable, as Program.cs's error message states." |
| Token in `localStorage` (XSS could read it) | "Accepted trade-off for a SPA; React escapes output by default. HttpOnly cookies would be the next step." |
| Logout doesn't revoke the JWT server-side | "Stateless JWT; token is deleted client-side, expires in 8 h. Deactivated users are blocked immediately via `OnTokenValidated`." |
| Emails aren't really sent (`ConsoleEmailSender`) | "Interface `IEmailSender` lets us swap in SMTP by changing one line in Program.cs (L23)." |
| User search is client-side | Fine for school-sized data; would move to a server `?q=` filter at scale. |
| No dedicated "Clear" button on the login form | Covered by state reset / error clearing; audit filters have Clear. |
| Duplicate CSV helper (`GradesController.Csv` vs `CsvText.Cell`) | Minor refactor leftover; same logic. |
| `AdminHome.jsx` is ~3,700 lines | One file per role dashboard; tabs are separate function components inside it. |

---

## 6. Demo checklist (do this before 12)
1. MySQL running, `spt_db` loaded (`01_schema.sql` → `02_seed.sql` → `03_...` → `04_demo_seed.sql`).
2. `cd backend && dotnet run` — keep the console visible (reset/verify links print there).
3. `cd frontend && npm run dev` → http://localhost:5173.
4. Have one account per role ready (admin / professor / student).
5. Demo flow: Admin login → audit log empty-ish → Professor posts grade + remark → Student sees grade, GWA, timeline, notification → Admin overrides grade → Reports: generate, PDF, Excel, Print → Audit log shows every step.
