# Backend Architecture: Controller → Service → Repository

Every request goes through exactly three layers, in one direction only:

```
HTTP request
   │
   ▼
Controller   (backend/Controllers)    receives the request, calls ONE service method, returns its result
   │
   ▼
Service      (backend/Services)       all business rules, validation, permissions, emails, audit, notifications
   │
   ▼
Repository   (backend/Repositories)   all database work: queries, inserts, updates, soft deletes, transactions
   │
   ▼
SptDbContext (EF Core) → MySQL
```

| Layer | Allowed to | Not allowed to |
|---|---|---|
| Controller | read route/query/body, check the role (`[Authorize]`), call a service, return `Respond(result)` | validate input, touch the database, contain `if` business rules |
| Service | validate, apply rules, decide the outcome (`ServiceResult.Ok / Invalid / NotFound ...`), call repositories and other services | use `SptDbContext` or EF Core, return HTTP types (`IActionResult`) |
| Repository | use `SptDbContext`: LINQ queries, `Add`, `Update`, `Remove`, `SaveChanges`, transactions | contain business rules or HTTP concerns |

You can check this rule from the code: `SptDbContext` appears only in `Repositories/`, `Data/` (the schema mapping and startup seeders) and `Program.cs` (where it is registered).

## How a result travels back

Services never return HTTP responses. They return a `ServiceResult` ([Common/ServiceResult.cs](../backend/Common/ServiceResult.cs)), which holds a status (`Ok`, `Created`, `BadRequest`, `NotFound`, `Conflict`, `Forbidden`, `Unauthorized`) and the response body.
[Controllers/ApiControllerBase.cs](../backend/Controllers/ApiControllerBase.cs) is the **one** place that turns a status into an HTTP code. Every controller action looks like this:

```csharp
[HttpPost("colleges")]
[Authorize(Roles = Roles.Admin)]
public async Task<IActionResult> AddCollege([FromBody] CollegeRequest request) =>
    Respond(await colleges.CreateAsync(request));
```

## Example: adding a college

1. **Controller**: `SetupController.AddCollege` passes the body to `ICollegeService.CreateAsync`.
2. **Service**: `CollegeService` trims and validates the code and name, asks the repository whether the code is taken, builds the `College`, saves it through the repository, writes the audit log and returns `ServiceResult.Created(...)`.
3. **Repository**: `CollegeRepository.CodeExistsAsync` and `AddAsync` run the SQL.

## Folder map

| Folder | Contents |
|---|---|
| `Controllers/` | 11 thin controllers + `ApiControllerBase` |
| `Services/Interfaces/` | one interface per service (`IGradeService`, `ITeacherService`, ...) |
| `Services/` | one implementation per interface |
| `Repositories/Interfaces/` | one interface per repository |
| `Repositories/` | one implementation per repository, plus `UnitOfWork` (transactions) |
| `Dtos/Requests/` | request bodies (what the frontend sends) |
| `Dtos/Queries/` | search filters passed from services to repositories |
| `Mappers/` | entity → JSON shape conversion (what the frontend receives) |
| `Models/` | EF Core entities (one per table) |
| `Common/` | `ServiceResult`, roles, grade/password rules, validation helpers, DI registration |
| `Data/` | `SptDbContext` (table mapping) and the startup seeders |

All interface → implementation pairs are registered in [Common/ServiceRegistration.cs](../backend/Common/ServiceRegistration.cs).

## Single Responsibility: one reason to change per class

| Area | Class | Its one job |
|---|---|---|
| Sign in | `AuthService` | login, logout, "who am I" |
| Sign up | `RegistrationService` | self sign-up, email verification |
| Passwords | `PasswordService` | forgot / reset / change password |
| Names | `UserNameService` | validating and saving "edit my name" (shared by every profile page) |
| Profiles | `ProfileService` | the student / teacher / admin profile pages |
| People | `TeacherService`, `StudentService`, `UserAccountService` | faculty accounts, student accounts, activate / deactivate / soft delete |
| IDs | `IdNumberService` | generating the next student ID and employee ID |
| School setup | `CollegeService`, `ProgramService`, `SubjectService`, `SemesterLoadService`, `TermService` | one entity each |
| Enrollment | `EnrollmentService` (student side), `EnrollmentQueueService` (admin approvals), `OfferingService` (sections) | |
| Grades | `GradeService` (entry), `GradeHistoryService` (who changed what), `GradeAccessPolicy` (who may see or edit), `GradeReportService` (admin report) | |
| Cross-cutting | `AuditService`, `NotificationService`, `AccountEmailService`, `EmailTokenService`, `JwtTokenService`, `BcryptPasswordHasher`, `CurrentUser` | |

## Transactions

When several writes must succeed or fail together (for example a grade plus its history row, or switching the active term), the service wraps the repository calls in `IUnitOfWork.ExecuteInTransactionAsync`. The transaction itself is a database concern, so it lives in the repository layer ([Repositories/UnitOfWork.cs](../backend/Repositories/UnitOfWork.cs)).

## Soft delete

"Deleting" a user never removes the row. `UserRepository.SoftDeleteAsync` marks the account inactive. The user loses access right away (the JWT check in `Program.cs` asks `IUserRepository.IsActiveAsync` on every request), and their grades and history are kept.

## Automatic ID numbers

Admins no longer type IDs. `IdNumberService` assigns them when an account is created:

- Students: `{year}-{4-digit sequence}`, e.g. `2026-0001`, `2026-0002`. The sequence restarts each year.
- Employees: `EMP-{4-digit sequence}`, e.g. `EMP-0006` (continues from the highest existing number).

Professors who sign up themselves also get an employee ID automatically. Students who sign up still enter the ID the registrar gave them.

## Changes from the mock defense

- Exports are **PDF / print only** (no CSV / Excel), for both the student grade export and the admin report. The PDF is generated with print-only permissions, so PDF readers block editing.
- The audit log no longer stores or shows IP addresses. For existing databases, run `database/05_remove_audit_ip.sql` once.
- Page state (open tab, sub-tab, selected college / program / department, page number) is kept in the URL, so a refresh stays on the same page.
