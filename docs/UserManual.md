# Student Performance Tracker — User Manual

**System:** Student Performance Tracker (SPT) — Alliance Team Titans
**Audience:** Students, Teachers (Professors) and Administrators
**Version:** 1.1 (updated November 24, 2026)

---

## 1. Getting Started

### 1.1 What you need
- A modern web browser (Chrome, Edge, Firefox or Safari).
- The web address of your school's SPT installation (for local testing: `http://localhost:5173`).
- An email address you can open (needed to verify a self-registered account).

### 1.2 One sign-in for everyone
There is **one** sign-in page for all roles. After you sign in, the system sends you to the correct dashboard automatically:

| Role | Dashboard | Sidebar label |
| --- | --- | --- |
| Student | `/studenthome` | STUDENT PORTAL |
| Teacher (Professor) | `/teacherhome` | TEACHER PORTAL |
| Admin | `/adminhome` | ADMIN PANEL |

> The old role-specific links (`/login/student`, `/login/teacher`, `/login/admin`) simply redirect to the single `/login` page.

### 1.3 Create an account (Students and Teachers)
1. On the landing page click **Create a new account** (or open `/signup`).
2. Choose **I am a → Student** or **Teacher**.
3. Fill in **First name**, **Middle** (optional), **Last name** and **Email**.
4. Enter your ID:
   - **Student:** your **Student ID**. It must already be pre-registered by the school. If it is not found you will see *"Student ID not found. Please contact the registrar."* If it was already claimed you will see *"This student ID is already registered."*
   - **Teacher:** your **Employee ID** (must be unique).
5. Enter a **Password** and **Confirm password**.
   - At least 8 characters, no more than 72.
   - Must contain **at least one letter and one number**.
6. Submit. A "Check your inbox" screen appears.
7. Open the verification email and click the link (valid for **24 hours**). Then go to **Sign in**.

**Teachers need approval.** By default a self-registered teacher account stays inactive until an administrator activates it. Until then, sign-in shows: *"This account is not active. It may be waiting for administrator approval…"*

> Administrators cannot self-register; admin accounts are created by the system setup. Admins can also create Teacher and Student accounts for you (see §4.4).

### 1.4 Sign in
1. Open `/login` and enter your **Email** and **Password**.
2. Click **Sign in**.

Common messages:

| Message | Meaning / what to do |
| --- | --- |
| Invalid email or password. | Check spelling. The same message is shown for unknown emails, for security. |
| Please verify your email before logging in. | Open the verification email, or use **Resend verification email** on the sign-in page. |
| This account is not active… | Waiting for admin approval or deactivated. Contact the administrator. |
| Unable to connect to the API. | The server is unreachable. Try again or contact your administrator. |

Your session lasts **8 hours** (480 minutes). After that, or if the administrator deactivates your account, you are returned to the sign-in page.

### 1.5 Forgot your password
1. On the sign-in page click **Forgot password?** and enter your email.
2. Open the email and click the reset link (valid for **1 hour**, single use).
3. Enter a new password that meets the rules in §1.3.

### 1.6 Using the dashboard
- Click the **logo / portal title** at the top of the sidebar to collapse or expand the sidebar.
- Use the sidebar to switch sections. **Log out** is at the bottom of the sidebar.
- The **bell icon** (top right of the Student and Admin dashboards) shows notifications. Use **Mark all read** or **View all** (Admin).

---

## 2. Student Guide

Sidebar: **Profile / Account**, **Prospectus**, **Enrollment**, **Grades**.

### 2.1 Profile / Account ("My Account")
- Top cards show your **Student ID**, **Program**, **Year level** and **College**.
- Edit **First / Middle / Last name** and click **Save Changes**. Email, program and year level are read-only.
- **Change Password:** enter **Current Password**, **New Password**, **Confirm New Password**, then **Update Password**.

### 2.2 Prospectus — request subjects
1. Open **Prospectus**. Cards show *Subjects*, *Units*, *Pending* and *Approved* counts for this semester.
2. Tick the subjects you want. Click **Clear** to reset your selection.
3. Click **Submit Request**.
4. Wait for admin review. You get a notification when a subject is **approved** ("…You can now pick a schedule") or **not approved** ("…You may request it again").

Rules the system enforces (an error is shown per subject if broken):
- Subject must belong to **your program**, **year level** and the **active semester**.
- You cannot request a subject that is already pending/approved/enrolled (a **rejected** one can be re-requested).
- **Prerequisites** must be passed (final grade of **3.00 or better**).
- Total units must not exceed your **semester unit limit** (set by the admin; **27** if none is set).
- A request needs an **active enrollment term**. If none, you will see *"There is no active enrollment period."*

### 2.3 Enrollment — pick your schedule
1. Open **Enrollment**. The header shows the active term (e.g. *2025-2026 – Semester 1*). If no term is active: *"Enrollment is currently closed."*
2. Under **Step 1 – Pick Your Schedule**, expand an **approved** subject.
3. Review the sections (Offer Code, Teacher, Schedule, Room, Slots) and click **Select** on one. Full sections show **Full**.
4. The status changes to **Enrolled** and your slot is reserved.

You can only choose a section for a subject that is **Approved**. Selecting is final in the app; contact the admin to change a section.

### 2.4 Grades
Tabs: **Enrolled Subjects**, **Grade Records**, **History Timeline**.
- Summary cards: **GWA**, **Units Earned**, **Passed**, **Failed**.
- **Grade Records:** Prelim, Midterm, Finals and Remarks per subject, with paging.
- **History Timeline:** every posting/edit of your grades (who changed what and when).
- **Export Grades** → **Download CSV** or **Download PDF**.

**Grade scale (Philippine):** 1.00 is best; **3.00 is the lowest passing grade**; 5.00 is failing. Grades move in steps of **0.25** (1.00, 1.25, 1.50 … 5.00). A subject counts as *passed* when the **Finals** grade is **≤ 3.00**.

### 2.5 Notifications
Click the bell to see grade posted/updated notices and enrollment decisions.

---

## 3. Teacher (Professor) Guide

Your portal has one workspace. Your assigned classes are listed in the sidebar under **My offerings**.

### 3.1 Choose an offering
- Click an offering in the sidebar (shows subject code and term). The page lists the **enrolled students** of that section.
- Cards show how many offerings are assigned to you. Click **Refresh** to reload.
- You only see **your own** offerings and students.

### 3.2 Enter grades
For each student fill **Prelim**, **Midterm**, **Finals** (any of them, at least one) and optional **Remarks**.
- **Post** – creates the grade (first time).
- **Update** – saves changes to an existing grade. Only changed values are recorded.
- **Delete** – click once, then click again to confirm.
- Allowed values: **1.00 – 5.00 in 0.25 steps**. Others (e.g. 1.37) are rejected.
- The student is notified automatically ("A grade was posted…" / "Your grade … was updated.").

### 3.3 Locked terms
Grades for a **past (non-active) term are locked** for teachers: *"Grades for a past term are locked. Ask an administrator to make the change."*

### 3.4 Profile, password and notifications
- The sidebar footer shows your name, employee ID and college (read-only).
- The current Teacher dashboard does **not** include a profile editor, a change-password form or a notification bell. To change a forgotten/temporary password use **Forgot password?** on the sign-in page (§1.5), or ask an administrator to update your details.
- Teachers do not receive in-app notifications; notifications are sent to **students** (and shown to admins).

---

## 4. Administrator Guide

Sidebar: **School Setup**, **People**, **Subject Offerings**, **Grade Overrides**, **Reports**, **Audit Logs**. Notifications open from the bell.

### 4.1 School Setup
Tabs: **Colleges**, **Degree Programs**, **Subjects**, **Semester Loads**. Build the structure in this order:
1. **College** (code + name) →
2. **Degree Program** (belongs to a college) →
3. **Subject** (code, name, units, year level, semester, prerequisites) →
4. **Semester Load** (maximum units per program / year level / semester).

### 4.2 Subject Offerings
Tabs: **Subject Offerings**, **Enrollment Requests**.
- **Create new term** – school year, semester (1/2), start/end dates; optionally make it **active**. Only **one term is active at a time**; activating one deactivates the others. The active term controls what students can request and what teachers can grade.
- **Create offering** – choose term, subject, teacher (optional, must be active), **schedule** (required, ≤120 chars), **room** (optional, ≤60 chars) and **slots (1–200)**. The offer code is generated, e.g. `IT101-1-01`.
- **Enrollment Requests (Request Queue)** – filter by status (Pending/Approved/Rejected/Enrolled), select rows, then **Approve** or **Reject**. Only *Pending* items change. Students are notified.

### 4.3 Grade Overrides
Search/filter grade entries, then edit or **Delete** any entry (including past terms). Edits are written to the student's grade history and the audit log.

### 4.4 People
Tabs: **Teachers**, **Students**, **All Users**.
- **New Faculty Account / New Student Account** – the system creates the account with a **temporary password**, marks the email as verified, and emails the credentials. The person should change the password at first sign-in.
- **Faculty by Department / Students by Program** – directory views.
- **Activate / Deactivate** – use **Activate** to approve a waiting self-registered teacher. Deactivated users lose access immediately. You cannot deactivate your own account.
- **Delete** – only allowed for users with **no** grades, enrollments or classes on record; otherwise deactivate instead. Admin accounts cannot be deleted here.

### 4.5 Reports
1. Set filters: term, program, year level, student, subject.
2. Generate the **Grade Summary Report** (Total, Graded, Passing, Failing and a results table).
3. **Export PDF**, **Export CSV**, **Export Excel**, or **Print**.
   Limits: on-screen table shows up to 5,000 rows (a "truncated" notice appears); CSV/Excel exports up to 20,000 rows.

### 4.6 Audit Logs
Filter by **action**, **actor type**, **actor ID** (student ID no. or employee ID) or **email**. Records include logins (success/failure), registrations, enrollment decisions, grade create/update/delete, user changes and term/offering creation. Use **Refresh** to reload.

### 4.7 Notifications
Open the bell → **View all** for recent system notifications.

---

## 5. Troubleshooting

| Problem | Solution |
| --- | --- |
| No verification/reset email arrives | In a development install, emails are printed in the API console instead of being sent. In production an email service must be configured (see Deployment Manual §6.4). Admin can create your account instead. |
| "Enrollment is currently closed" | No active term. Ask the admin to activate a term. |
| Subject missing from Prospectus | It is not in your program / year level / this semester. |
| Cannot post a grade | Student not enrolled in that section, term is past, or grade not in 0.25 steps. |
| Page sends you to sign-in | Session expired (8 h) or account deactivated. Sign in again. |

## 6. Demo accounts (development/testing only)
Available only when demo data is enabled (`Seed:DemoData = true`). **Never use in production.**

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@spt.local` | `admin123!` |
| Professors (EMP-0001…0005) | e.g. `prof.santos@spt.local` | `Password123` |
| Students | e.g. `mark.delacruz@student.spt.local` | `Password123` |

Unclaimed student IDs for sign-up testing: `2025-0003`, `2025-0013`, `2025-0014` (when demo data is loaded).
