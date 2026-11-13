using System.Net.Mail;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;
using SptApi.Services;

namespace SptApi.Controllers;

public class RegisterRequest
{
    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }
    public string? Role { get; set; }
    public string? Password { get; set; }
    public string? ConfirmPassword { get; set; }
    public string? StudentId { get; set; }
    public string? EmployeeId { get; set; }
}

public class VerifyStudentRequest { public string? StudentId { get; set; } }
public class EmailRequest { public string? Email { get; set; } }
public class ResetPasswordRequest { public string? Token { get; set; } public string? NewPassword { get; set; } }
public class ChangePasswordRequest { public string? CurrentPassword { get; set; } public string? NewPassword { get; set; } }

[ApiController]
[Route("api/auth")]
public class AccountController(
    SptDbContext db,
    EmailTokenService tokens,
    IEmailSender email,
    AuditService audit,
    IConfiguration config) : ControllerBase
{
    private string FrontendUrl => (config["App:FrontendUrl"] ?? "http://localhost:5173").TrimEnd('/');

    // ───────── Sign up ─────────

    // POST /api/auth/verify-student   -> { exists: true/false }
    [HttpPost("verify-student")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyStudent([FromBody] VerifyStudentRequest req)
    {
        var id = (req.StudentId ?? "").Trim();
        var exists = id != "" && await db.Students.AnyAsync(s => s.StudentIdNo == id);
        return Ok(new { exists });
    }

    // POST /api/auth/register
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        // Errors are returned as { field_name: ["message"] } because the SignUp page shows them under each field.
        var errors = new Dictionary<string, string[]>();

        var mail = (req.Email ?? "").Trim().ToLowerInvariant();
        var role = (req.Role ?? "").Trim().ToUpperInvariant();
        var first = (req.FirstName ?? "").Trim();
        var last = (req.LastName ?? "").Trim();
        var middle = string.IsNullOrWhiteSpace(req.MiddleName) ? null : req.MiddleName.Trim();

        if (first == "") errors["first_name"] = ["First name is required."];
        if (last == "") errors["last_name"] = ["Last name is required."];

        if (!MailAddress.TryCreate(mail, out var parsed) || parsed.Address != mail)
            errors["email"] = ["Enter a valid email address."];

        if (role != Roles.Student && role != Roles.Professor)
            errors["role"] = ["Role must be STUDENT or PROFESSOR."];

        var pwError = PasswordRules.Validate(req.Password);
        if (pwError != null) errors["password"] = [pwError];
        else if (req.Password != req.ConfirmPassword) errors["confirm_password"] = ["Passwords do not match."];

        if (errors.Count > 0) return BadRequest(errors);

        if (await db.Users.AnyAsync(u => u.Email == mail))
            errors["email"] = ["An account with this email already exists."];

        Student? student = null;
        var employeeId = (req.EmployeeId ?? "").Trim();

        if (role == Roles.Student)
        {
            var sid = (req.StudentId ?? "").Trim();
            if (sid == "") errors["student_id"] = ["Student ID is required."];
            else
            {
                student = await db.Students.FirstOrDefaultAsync(s => s.StudentIdNo == sid);
                if (student is null) errors["student_id"] = ["Student ID not found. Please contact the registrar."];
                else if (student.UserId != null) errors["student_id"] = ["This student ID is already registered."];
            }
        }
        else
        {
            if (employeeId == "") errors["employee_id"] = ["Employee ID is required."];
            else if (await db.Teachers.AnyAsync(t => t.EmployeeId == employeeId))
                errors["employee_id"] = ["This employee ID is already registered."];
        }

        if (errors.Count > 0) return BadRequest(errors);

        // Anyone can open the sign-up page, so a self-registered professor must be approved by an admin
        // before they can log in and enter grades. Turn off with Registration:ProfessorsNeedApproval = false.
        var needsApproval = config.GetValue<bool>("Registration:ProfessorsNeedApproval", true);

        var user = new User
        {
            Email = mail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password!),
            Role = role,
            FirstName = first,
            MiddleName = middle,
            LastName = last,
            IsActive = !(role == Roles.Professor && needsApproval),
            EmailVerified = false,
            DateJoined = DateTime.UtcNow
        };
        db.Users.Add(user);

        if (student != null) student.User = user;                 // link the pre-registered student record
        else db.Teachers.Add(new Teacher { User = user, EmployeeId = employeeId });

        await db.SaveChangesAsync();

        await audit.LogAsync("REGISTER", "User", user.Id, $"New {role} account registered",
            actorId: user.Id, email: user.Email, role: user.Role);

        try { await SendVerificationEmail(user); }
        catch (Exception ex) { Console.WriteLine($"[Email] Could not send verification email: {ex.Message}"); }

        return StatusCode(201, new { message = "Account created. Please check your email to verify your address." });
    }

    // ───────── Email verification ─────────

    // GET /api/auth/verify-email/{token}
    [HttpGet("verify-email/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyEmail(string token)
    {
        var failed = new { error = "Verification failed or link has expired." };
        var hash = EmailTokenService.Hash(token);

        var rec = await db.EmailTokens.Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == hash && t.Purpose == EmailTokenService.Verify);
        if (rec is null) return BadRequest(failed);

        // Already verified (e.g. the page called this twice): treat as success.
        if (rec.User.EmailVerified) return Ok(new { message = "Email verified. You can now sign in." });

        if (rec.UsedAt != null || rec.ExpiresAt < DateTime.UtcNow) return BadRequest(failed);

        rec.User.EmailVerified = true;
        rec.UsedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await audit.LogAsync("EMAIL_VERIFIED", "User", rec.User.Id, "Email address verified",
            actorId: rec.User.Id, email: rec.User.Email, role: rec.User.Role);

        return Ok(new { message = "Email verified. You can now sign in." });
    }

    // POST /api/auth/resend-verification
    [HttpPost("resend-verification")]
    [AllowAnonymous]
    public async Task<IActionResult> ResendVerification([FromBody] EmailRequest req)
    {
        var mail = (req.Email ?? "").Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == mail);

        if (user is { EmailVerified: false })
        {
            try { await SendVerificationEmail(user); }
            catch (Exception ex) { Console.WriteLine($"[Email] Could not send: {ex.Message}"); }
        }

        // Same answer whether or not the account exists, so this can't be used to discover registered emails.
        return Ok(new { message = "If that account exists and is not yet verified, a new link has been sent." });
    }

    // ───────── Forgot / reset / change password ─────────

    // POST /api/auth/password/forgot
    [HttpPost("password/forgot")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] EmailRequest req)
    {
        var mail = (req.Email ?? "").Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == mail);

        if (user != null && user.IsActive != false)
        {
            try
            {
                var raw = await tokens.IssueAsync(user.Id, EmailTokenService.Reset, TimeSpan.FromHours(1));
                await email.SendAsync(user.Email, "Reset your password - Student Performance Tracker",
                    $"Hi {user.FirstName},\n\nOpen this link to choose a new password (valid for 1 hour):\n" +
                    $"{FrontendUrl}/reset-password/{raw}\n\nIf you didn't ask for this, you can ignore this email.");
                await audit.LogAsync("PASSWORD_RESET_REQUESTED", "User", user.Id, "Password reset link requested",
                    actorId: user.Id, email: user.Email, role: user.Role);
            }
            catch (Exception ex) { Console.WriteLine($"[Email] Could not send: {ex.Message}"); }
        }

        return Ok(new { message = "If the email exists, a reset link has been sent." });
    }

    // POST /api/auth/password/reset   { token, new_password }
    [HttpPost("password/reset")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest req)
    {
        var pwError = PasswordRules.Validate(req.NewPassword);
        if (pwError != null) return BadRequest(new { error = pwError });

        var rec = await tokens.FindValidAsync(req.Token ?? "", EmailTokenService.Reset);
        if (rec is null) return BadRequest(new { error = "This reset link is invalid or has expired." });

        rec.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword!);
        rec.UsedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        await audit.LogAsync("PASSWORD_RESET", "User", rec.User.Id, "Password reset using email link",
            actorId: rec.User.Id, email: rec.User.Email, role: rec.User.Role);

        return Ok(new { message = "Password updated. You can now sign in." });
    }

    // POST /api/auth/password/change   { current_password, new_password }   (must be logged in)
    [HttpPost("password/change")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest req)
    {
        var userId = User.UserId();
        var user = userId is null ? null : await db.Users.FindAsync(userId);
        if (user is null) return Unauthorized();

        var errors = new Dictionary<string, string[]>();

        if (string.IsNullOrEmpty(req.CurrentPassword) || !BCrypt.Net.BCrypt.Verify(req.CurrentPassword, user.PasswordHash))
            errors["current_password"] = ["Current password is incorrect."];

        var pwError = PasswordRules.Validate(req.NewPassword);
        if (pwError != null) errors["new_password"] = [pwError];
        else if (req.NewPassword == req.CurrentPassword)
            errors["new_password"] = ["New password must be different from the current one."];

        if (errors.Count > 0) return BadRequest(errors);

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewPassword!);
        await db.SaveChangesAsync();
        await audit.LogAsync("PASSWORD_CHANGE", "User", user.Id, "Password changed by user");

        return Ok(new { message = "Password changed." });
    }

    // ───────── helpers ─────────
    private async Task SendVerificationEmail(User user)
    {
        var raw = await tokens.IssueAsync(user.Id, EmailTokenService.Verify, TimeSpan.FromHours(24));
        await email.SendAsync(user.Email, "Verify your email - Student Performance Tracker",
            $"Hi {user.FirstName},\n\nPlease verify your email by opening this link (valid for 24 hours):\n" +
            $"{FrontendUrl}/verify-email/{raw}\n\nIf you didn't create this account, you can ignore this email.");
    }
}