using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;
using SptApi.Services;

namespace SptApi.Controllers;

public class UpdateProfileRequest
{
    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }
}

public class FcmTokenRequest
{
    public string? FcmToken { get; set; }
}

// Role-specific profile pages. Users can edit their own name only; email, role and IDs are admin-managed.
[ApiController]
[Route("api/auth")]
[Authorize]
public class ProfileController(SptDbContext db, AuditService audit) : ControllerBase
{
    // ───────── Student ─────────

    // GET /api/auth/profile/student/
    [HttpGet("profile/student")]
    [Authorize(Roles = Roles.Student)]
    public async Task<IActionResult> GetStudent()
    {
        var student = await LoadStudent();
        return student is null ? NotFound(new { detail = "No student profile for this account." }) : Ok(StudentDto(student));
    }

    // PATCH /api/auth/profile/student/
    [HttpPatch("profile/student")]
    [Authorize(Roles = Roles.Student)]
    public async Task<IActionResult> UpdateStudent([FromBody] UpdateProfileRequest req)
    {
        var student = await LoadStudent();
        if (student?.User is null) return NotFound(new { detail = "No student profile for this account." });

        var errors = await ApplyNames(student.User, req);
        if (errors != null) return BadRequest(errors);
        return Ok(StudentDto(student));
    }

    // ───────── Teacher ─────────

    // GET /api/auth/profile/teacher/
    [HttpGet("profile/teacher")]
    [Authorize(Roles = Roles.Professor)]
    public async Task<IActionResult> GetTeacher()
    {
        var teacher = await LoadTeacher();
        return teacher is null ? NotFound(new { detail = "No teacher profile for this account." }) : Ok(TeacherDto(teacher));
    }

    // PATCH /api/auth/profile/teacher/
    [HttpPatch("profile/teacher")]
    [Authorize(Roles = Roles.Professor)]
    public async Task<IActionResult> UpdateTeacher([FromBody] UpdateProfileRequest req)
    {
        var teacher = await LoadTeacher();
        if (teacher is null) return NotFound(new { detail = "No teacher profile for this account." });

        var errors = await ApplyNames(teacher.User, req);
        if (errors != null) return BadRequest(errors);
        return Ok(TeacherDto(teacher));
    }

    // ───────── Admin ─────────

    // GET /api/auth/profile/admin/
    [HttpGet("profile/admin")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> GetAdmin()
    {
        var user = await LoadUser();
        return user is null ? Unauthorized() : Ok(AdminDto(user));
    }

    // PATCH /api/auth/profile/admin/
    [HttpPatch("profile/admin")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> UpdateAdmin([FromBody] UpdateProfileRequest req)
    {
        var user = await LoadUser();
        if (user is null) return Unauthorized();

        var errors = await ApplyNames(user, req);
        if (errors != null) return BadRequest(errors);
        return Ok(AdminDto(user));
    }

    // ───────── Push token ─────────

    // PATCH /api/auth/me/fcm-token/   { fcm_token }   (empty or null clears it)
    // This only stores the token. Nothing sends push notifications yet.
    [HttpPatch("me/fcm-token")]
    public async Task<IActionResult> UpdateFcmToken([FromBody] FcmTokenRequest req)
    {
        var user = await LoadUser();
        if (user is null) return Unauthorized();

        var token = string.IsNullOrWhiteSpace(req.FcmToken) ? null : req.FcmToken.Trim();
        if (token is { Length: > 255 })
            return BadRequest(new Dictionary<string, string[]> { ["fcm_token"] = ["Token is too long."] });

        user.FcmToken = token;
        await db.SaveChangesAsync();
        return Ok(new { detail = token is null ? "Push token cleared." : "Push token saved." });
    }

    // ═════════════════════════ helpers ═════════════════════════

    private Task<User?> LoadUser()
    {
        var id = User.UserId();
        return db.Users.FirstOrDefaultAsync(u => u.Id == id);
    }

    private Task<Student?> LoadStudent()
    {
        var id = User.UserId();
        return db.Students.Include(s => s.User).Include(s => s.Program)
            .FirstOrDefaultAsync(s => s.UserId == id);
    }

    private Task<Teacher?> LoadTeacher()
    {
        var id = User.UserId();
        return db.Teachers.Include(t => t.User).Include(t => t.College)
            .FirstOrDefaultAsync(t => t.UserId == id);
    }

    // Updates names that were sent. Returns validation errors, or null on success.
    private async Task<Dictionary<string, string[]>?> ApplyNames(User user, UpdateProfileRequest req)
    {
        var errors = new Dictionary<string, string[]>();

        if (req.FirstName is not null)
        {
            var v = req.FirstName.Trim();
            if (v == "") errors["first_name"] = ["First name cannot be empty."];
            else if (v.Length > 80) errors["first_name"] = ["First name must be 80 characters or fewer."];
        }
        if (req.LastName is not null)
        {
            var v = req.LastName.Trim();
            if (v == "") errors["last_name"] = ["Last name cannot be empty."];
            else if (v.Length > 80) errors["last_name"] = ["Last name must be 80 characters or fewer."];
        }
        if (req.MiddleName is { Length: > 80 })
            errors["middle_name"] = ["Middle name must be 80 characters or fewer."];

        if (errors.Count > 0) return errors;

        if (req.FirstName is not null) user.FirstName = req.FirstName.Trim();
        if (req.LastName is not null) user.LastName = req.LastName.Trim();
        if (req.MiddleName is not null)
            user.MiddleName = string.IsNullOrWhiteSpace(req.MiddleName) ? null : req.MiddleName.Trim();

        await db.SaveChangesAsync();
        await audit.LogAsync("PROFILE_UPDATE", "User", user.Id, "Updated own name");
        return null;
    }

    private static object StudentDto(Student s) => new
    {
        id = s.Id,
        user_id = s.UserId,
        email = s.User?.Email,
        first_name = s.User?.FirstName,
        middle_name = s.User?.MiddleName,
        last_name = s.User?.LastName,
        student_id = s.StudentIdNo,
        program = s.ProgramId,
        program_code = s.Program?.Code,
        program_name = s.Program?.Name,
        year_level = s.YearLevel
    };

    private static object TeacherDto(Teacher t) => new
    {
        id = t.Id,
        user_id = t.UserId,
        email = t.User.Email,
        first_name = t.User.FirstName,
        middle_name = t.User.MiddleName,
        last_name = t.User.LastName,
        teacher_id = t.EmployeeId,
        college = t.CollegeId,
        college_name = t.College?.Name,
        department_code = t.DepartmentCode
    };

    private static object AdminDto(User u) => new
    {
        id = u.Id,
        email = u.Email,
        first_name = u.FirstName,
        middle_name = u.MiddleName,
        last_name = u.LastName
    };
}