using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;
using SptApi.Services;

namespace SptApi.Controllers;

public class AdminUpdateUserRequest
{
    public bool? IsActive { get; set; }
    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }
}

public class AdminCreateTeacherRequest
{
    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }
    public string? EmployeeId { get; set; }
    public int? Department { get; set; }          // college id (frontend sends "department")
    public List<int>? Subjects { get; set; }      // subject ids
}

public class AdminCreateStudentRequest
{
    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }
    public string? StudentId { get; set; }
    public int? Program { get; set; }             // program id (frontend sends "program")
    public int? YearLevel { get; set; }
}

public class UpdateTeacherSubjectsRequest
{
    public List<int>? Subjects { get; set; }
}

// Same route prefix the frontend expects (/api/auth/admin/...).
[ApiController]
[Route("api/auth/admin")]
[Authorize(Roles = Roles.Admin)]
public class AdminController(SptDbContext db, AuditService audit, IEmailSender email, IConfiguration config) : ControllerBase
{
    private string FrontendUrl => (config["App:FrontendUrl"] ?? "http://localhost:5173").TrimEnd('/');

    private static string FullName(User u) =>
        string.Join(" ", new[] { u.FirstName, u.MiddleName, u.LastName }.Where(s => !string.IsNullOrWhiteSpace(s)));

    // ───────── Teachers ─────────

    // GET /api/auth/admin/teachers
    [HttpGet("teachers")]
    public async Task<IActionResult> GetTeachers()
    {
        var rows = await db.Teachers
            .Include(t => t.User)
            .Include(t => t.Subjects)
            .OrderBy(t => t.User.LastName).ThenBy(t => t.User.FirstName)
            .ToListAsync();

        return Ok(rows.Select(t => new
        {
            id = t.Id,
            user_id = t.UserId,
            employee_id = t.EmployeeId,
            department = t.CollegeId,
            email = t.User.Email,
            first_name = t.User.FirstName,
            middle_name = t.User.MiddleName,
            last_name = t.User.LastName,
            full_name = FullName(t.User),
            is_active = t.User.IsActive ?? true,
            email_verified = t.User.EmailVerified,
            pending_approval = t.User.IsActive == false,
            subjects = t.Subjects.Select(s => new { id = s.Id, code = s.Code, name = s.Name })
        }));
    }

    // POST /api/auth/admin/create-teacher
    [HttpPost("create-teacher")]
    public async Task<IActionResult> CreateTeacher([FromBody] AdminCreateTeacherRequest req)
    {
        var errors = new Dictionary<string, string[]>();
        var mail = (req.Email ?? "").Trim().ToLowerInvariant();
        var first = (req.FirstName ?? "").Trim();
        var last = (req.LastName ?? "").Trim();
        var empId = (req.EmployeeId ?? "").Trim();

        if (first == "") errors["first_name"] = ["First name is required."];
        if (last == "") errors["last_name"] = ["Last name is required."];
        if (!IsValidEmail(mail)) errors["email"] = ["Enter a valid email address."];
        if (empId == "") errors["employee_id"] = ["Employee ID is required."];
        if (errors.Count > 0) return BadRequest(errors);

        if (await db.Users.AnyAsync(u => u.Email == mail))
            errors["email"] = ["An account with this email already exists."];
        if (await db.Teachers.AnyAsync(t => t.EmployeeId == empId))
            errors["employee_id"] = ["This employee ID is already registered."];
        if (req.Department is int cid && !await db.Colleges.AnyAsync(c => c.Id == cid))
            errors["department"] = ["College not found."];

        var subjectIds = (req.Subjects ?? []).Distinct().ToList();
        var subjects = await db.Subjects.Where(s => subjectIds.Contains(s.Id)).ToListAsync();
        if (subjects.Count != subjectIds.Count) errors["subjects"] = ["One or more subjects were not found."];
        if (errors.Count > 0) return BadRequest(errors);

        var tempPassword = NewTempPassword();
        var user = new User
        {
            Email = mail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword),
            Role = Roles.Professor,
            FirstName = first,
            MiddleName = string.IsNullOrWhiteSpace(req.MiddleName) ? null : req.MiddleName.Trim(),
            LastName = last,
            IsActive = true,
            EmailVerified = true,     // the admin vouches for this address
            DateJoined = DateTime.UtcNow
        };
        var teacher = new Teacher { User = user, EmployeeId = empId, CollegeId = req.Department };
        foreach (var s in subjects) teacher.Subjects.Add(s);
        db.Teachers.Add(teacher);
        await db.SaveChangesAsync();

        await audit.LogAsync("TEACHER_CREATE", "Teacher", teacher.Id, $"Admin created professor account {mail}");
        await SendCredentials(user, tempPassword);

        return StatusCode(201, new { detail = "Teacher account created.", id = teacher.Id, user_id = user.Id });
    }

    // PATCH /api/auth/admin/teachers/{id}   { subjects: [ids] }   (frontend: updateTeacherSubjects)
    [HttpPatch("teachers/{id:int}")]
    public async Task<IActionResult> UpdateTeacherSubjects(int id, [FromBody] UpdateTeacherSubjectsRequest req)
    {
        var teacher = await db.Teachers.Include(t => t.Subjects).FirstOrDefaultAsync(t => t.Id == id);
        if (teacher is null) return NotFound(new { detail = "Teacher not found." });

        var ids = (req.Subjects ?? []).Distinct().ToList();
        var subjects = await db.Subjects.Where(s => ids.Contains(s.Id)).ToListAsync();
        if (subjects.Count != ids.Count) return BadRequest(new { subjects = new[] { "One or more subjects were not found." } });

        teacher.Subjects.Clear();
        foreach (var s in subjects) teacher.Subjects.Add(s);
        await db.SaveChangesAsync();

        await audit.LogAsync("TEACHER_SUBJECTS_UPDATE", "Teacher", teacher.Id,
            $"Subjects set to: {string.Join(", ", subjects.Select(s => s.Code))}");
        return Ok(new { detail = "Subjects updated." });
    }

    // ───────── Students ─────────

    // GET /api/auth/admin/students
    [HttpGet("students")]
    public async Task<IActionResult> GetStudents()
    {
        var rows = await db.Students
            .Include(s => s.User)
            .Include(s => s.Program)
            .OrderBy(s => s.StudentIdNo)
            .ToListAsync();

        return Ok(rows.Select(s => new
        {
            id = s.Id,
            user_id = s.UserId,
            student_id = s.StudentIdNo,
            program = s.ProgramId,
            program_code = s.Program?.Code,
            program_name = s.Program?.Name,
            year_level = s.YearLevel,
            registered = s.User != null,     // false = pre-loaded ID that hasn't signed up yet
            email = s.User?.Email,
            first_name = s.User?.FirstName,
            middle_name = s.User?.MiddleName,
            last_name = s.User?.LastName,
            full_name = s.User is null ? null : FullName(s.User),
            is_active = s.User?.IsActive ?? true
        }));
    }

    // POST /api/auth/admin/create-student
    [HttpPost("create-student")]
    public async Task<IActionResult> CreateStudent([FromBody] AdminCreateStudentRequest req)
    {
        var errors = new Dictionary<string, string[]>();
        var mail = (req.Email ?? "").Trim().ToLowerInvariant();
        var first = (req.FirstName ?? "").Trim();
        var last = (req.LastName ?? "").Trim();
        var sid = (req.StudentId ?? "").Trim();

        if (first == "") errors["first_name"] = ["First name is required."];
        if (last == "") errors["last_name"] = ["Last name is required."];
        if (!IsValidEmail(mail)) errors["email"] = ["Enter a valid email address."];
        if (sid == "") errors["student_id"] = ["Student ID is required."];
        if (req.YearLevel is < 1 or > 6) errors["year_level"] = ["Year level must be between 1 and 6."];
        if (errors.Count > 0) return BadRequest(errors);

        if (await db.Users.AnyAsync(u => u.Email == mail))
            errors["email"] = ["An account with this email already exists."];
        if (req.Program is int pid && !await db.Programs.AnyAsync(p => p.Id == pid))
            errors["program"] = ["Program not found."];

        // The registrar may have pre-loaded this ID; if so, link to it instead of duplicating.
        var student = await db.Students.FirstOrDefaultAsync(s => s.StudentIdNo == sid);
        if (student?.UserId != null) errors["student_id"] = ["This student ID is already registered."];
        if (errors.Count > 0) return BadRequest(errors);

        var tempPassword = NewTempPassword();
        var user = new User
        {
            Email = mail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword),
            Role = Roles.Student,
            FirstName = first,
            MiddleName = string.IsNullOrWhiteSpace(req.MiddleName) ? null : req.MiddleName.Trim(),
            LastName = last,
            IsActive = true,
            EmailVerified = true,
            DateJoined = DateTime.UtcNow
        };

        if (student is null)
        {
            student = new Student { StudentIdNo = sid };
            db.Students.Add(student);
        }
        student.User = user;
        if (req.Program != null) student.ProgramId = req.Program;
        if (req.YearLevel != null) student.YearLevel = (sbyte)req.YearLevel;

        await db.SaveChangesAsync();

        await audit.LogAsync("STUDENT_CREATE", "Student", student.Id, $"Admin created student account {mail} ({sid})");
        await SendCredentials(user, tempPassword);

        return StatusCode(201, new { detail = "Student account created.", id = student.Id, user_id = user.Id });
    }

    // ───────── Any user ─────────

    // PATCH /api/auth/admin/users/{userId}   (approve a professor, deactivate/reactivate, fix a name)
    [HttpPatch("users/{userId:int}")]
    public async Task<IActionResult> UpdateUser(int userId, [FromBody] AdminUpdateUserRequest req)
    {
        var user = await db.Users.FindAsync(userId);
        if (user is null) return NotFound(new { detail = "User not found." });

        if (req.IsActive == false && user.Id == User.UserId())
            return BadRequest(new { detail = "You cannot deactivate your own account." });

        var changes = new List<string>();

        if (req.IsActive is bool active && active != (user.IsActive ?? true))
        {
            user.IsActive = active;
            changes.Add(active ? "activated" : "deactivated");
        }
        if (!string.IsNullOrWhiteSpace(req.FirstName)) { user.FirstName = req.FirstName.Trim(); changes.Add("first name"); }
        if (req.MiddleName is not null)                { user.MiddleName = req.MiddleName.Trim(); changes.Add("middle name"); }
        if (!string.IsNullOrWhiteSpace(req.LastName))  { user.LastName = req.LastName.Trim(); changes.Add("last name"); }

        if (changes.Count == 0) return Ok(new { detail = "No changes." });

        await db.SaveChangesAsync();
        await audit.LogAsync("USER_UPDATE", "User", user.Id, $"Admin updated {user.Email}: {string.Join(", ", changes)}");

        return Ok(new { detail = "User updated.", id = user.Id, is_active = user.IsActive ?? true });
    }

    // DELETE /api/auth/admin/users/{userId}
    // Refuses when the user has grades or classes attached, so records are never silently lost.
    // Deactivate them instead (PATCH above).
    [HttpDelete("users/{userId:int}")]
    public async Task<IActionResult> DeleteUser(int userId)
    {
        var user = await db.Users
            .Include(u => u.Student)
            .Include(u => u.Teacher)
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return NotFound(new { detail = "User not found." });

        if (user.Id == User.UserId())
            return BadRequest(new { detail = "You cannot delete your own account." });
        if (user.Role == Roles.Admin)
            return BadRequest(new { detail = "Admin accounts cannot be deleted here." });

        var hasGrades = await db.Grades.AnyAsync(g => g.EnteredBy == userId)
                        || await db.GradeHistories.AnyAsync(h => h.ChangedBy == userId);
        var hasEnrollments = user.Student != null
                        && await db.Enrollments.AnyAsync(e => e.StudentId == user.Student.Id);
        var hasOfferings = user.Teacher != null
                        && await db.Offerings.AnyAsync(o => o.TeacherId == user.Teacher.Id);

        if (hasGrades || hasEnrollments || hasOfferings)
            return Conflict(new { detail = "This user has grades, enrollments or classes on record. Deactivate the account instead of deleting it." });

        var label = $"{user.Email} ({user.Role})";
        db.Users.Remove(user);   // students.user_id -> SET NULL (pre-loaded ID stays), teachers cascade
        await db.SaveChangesAsync();

        await audit.LogAsync("USER_DELETE", "User", userId, $"Admin deleted {label}");
        return Ok(new { detail = "User deleted." });
    }

    // ───────── Audit log ─────────

    // GET /api/auth/admin/audit-logs?action=&actor_type=&actor_id=&email=
    // actor_id here is the student ID number or employee ID the admin typed in (the filter label says so).
    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetAuditLogs(
        [FromQuery] string? action, [FromQuery(Name = "actor_type")] string? actorType,
        [FromQuery(Name = "actor_id")] string? actorId, [FromQuery] string? email)
    {
        var q = db.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(action))
            q = q.Where(l => l.Action.Contains(action.Trim()));
        if (!string.IsNullOrWhiteSpace(actorType))
            q = q.Where(l => l.ActorType == actorType.Trim().ToUpperInvariant());
        if (!string.IsNullOrWhiteSpace(email))
            q = q.Where(l => l.UserEmail != null && l.UserEmail.Contains(email.Trim().ToLowerInvariant()));

        if (!string.IsNullOrWhiteSpace(actorId))
        {
            var key = actorId.Trim();
            var userIds = await db.Students.Where(s => s.StudentIdNo == key && s.UserId != null).Select(s => s.UserId!.Value)
                .Concat(db.Teachers.Where(t => t.EmployeeId == key).Select(t => t.UserId))
                .ToListAsync();
            q = q.Where(l => l.ActorId != null && userIds.Contains(l.ActorId.Value));
        }

        var logs = await q.OrderByDescending(l => l.CreatedAt).ThenByDescending(l => l.Id).Take(500).ToListAsync();

        return Ok(logs.Select(l => new
        {
            id = l.Id,
            actor_id = l.ActorId,
            actor_type = l.ActorType,
            user_email = l.UserEmail,
            action = l.Action,
            entity = l.Entity,
            entity_id = l.EntityId,
            details = l.Details,
            ip_address = l.IpAddress,
            created_at = l.CreatedAt
        }));
    }

    // ───────── helpers ─────────

    private static bool IsValidEmail(string mail) =>
        System.Net.Mail.MailAddress.TryCreate(mail, out var parsed) && parsed.Address == mail;

    // 12 chars, always has letters and digits so it passes PasswordRules.
    private static string NewTempPassword()
    {
        const string letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
        const string digits = "23456789";
        var chars = new char[12];
        for (var i = 0; i < chars.Length; i++)
        {
            var set = i % 3 == 2 ? digits : letters;
            chars[i] = set[RandomNumberGenerator.GetInt32(set.Length)];
        }
        return new string(chars);
    }

    private async Task SendCredentials(User user, string tempPassword)
    {
        try
        {
            await email.SendAsync(user.Email, "Your account - Student Performance Tracker",
                $"Hi {user.FirstName},\n\nAn administrator created an account for you.\n\n" +
                $"Email: {user.Email}\nTemporary password: {tempPassword}\n\n" +
                $"Sign in at {FrontendUrl}/login and change your password right away.");
        }
        catch (Exception ex) { Console.WriteLine($"[Email] Could not send credentials: {ex.Message}"); }
    }
}