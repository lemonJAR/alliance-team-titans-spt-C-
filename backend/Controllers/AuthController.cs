using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;
using SptApi.Services;

namespace SptApi.Controllers;

public class LoginRequest
{
    public string? Email { get; set; }
    public string? Password { get; set; }
}

public class UpdateMeRequest
{
    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }
}

[ApiController]
[Route("api/auth")]
public class AuthController(SptDbContext db, TokenService tokens, AuditService audit) : ControllerBase
{
    // POST /api/auth/login   (frontend: login())
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var email = req.Email?.Trim().ToLowerInvariant() ?? "";
        var password = req.Password ?? "";

        var user = await db.Users
            .Include(u => u.Student)
            .Include(u => u.Teacher)
            .FirstOrDefaultAsync(u => u.Email == email);

        // Same message for "no such user" and "wrong password" so attackers can't tell which emails exist.
        // We use 400 (not 401) because the frontend logs the user out on any 401.
        if (user is null || !BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        {
            await audit.LogAsync("LOGIN_FAILED", "User", user?.Id, $"Failed login for {email}",
                actorId: user?.Id, email: email, role: user?.Role);
            return BadRequest(new { detail = "Invalid email or password." });
        }

        if (user.IsActive == false)
            return StatusCode(403, new { detail = "This account is not active. It may be waiting for administrator approval or has been deactivated. Contact the administrator." });

        if (!user.EmailVerified)
            return StatusCode(403, new { detail = "Please verify your email before logging in." });

        await audit.LogAsync("LOGIN", "User", user.Id, "User logged in",
            actorId: user.Id, email: user.Email, role: user.Role);

        return Ok(new { token = tokens.Create(user), user = ToDto(user) });
    }

    // POST /api/auth/logout   (frontend: logout())
    // JWTs are stateless, so the real logout is the frontend deleting the token.
    // This endpoint just records it in the audit log.
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await audit.LogAsync("LOGOUT", "User", User.UserId(), "User logged out");
        return Ok(new { detail = "Logged out." });
    }

    // GET /api/auth/me
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        var user = await LoadCurrentUser();
        return user is null ? Unauthorized() : Ok(ToDto(user));
    }

    // PATCH /api/auth/me   (name only; email/role can't be self-edited)
    [HttpPatch("me")]
    [Authorize]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateMeRequest req)
    {
        var user = await LoadCurrentUser();
        if (user is null) return Unauthorized();

        if (!string.IsNullOrWhiteSpace(req.FirstName)) user.FirstName = req.FirstName.Trim();
        if (req.MiddleName is not null) user.MiddleName = req.MiddleName.Trim();
        if (!string.IsNullOrWhiteSpace(req.LastName)) user.LastName = req.LastName.Trim();

        await db.SaveChangesAsync();
        await audit.LogAsync("PROFILE_UPDATE", "User", user.Id, "Updated own name");
        return Ok(ToDto(user));
    }

    // ───────── helpers ─────────
    private async Task<User?> LoadCurrentUser()
    {
        var id = User.UserId();
        if (id is null) return null;
        return await db.Users
            .Include(u => u.Student)
            .Include(u => u.Teacher)
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    private static object ToDto(User u) => new
    {
        id = u.Id,
        email = u.Email,
        role = u.Role,
        first_name = u.FirstName,
        middle_name = u.MiddleName,
        last_name = u.LastName,
        email_verified = u.EmailVerified,
        student_id_no = u.Student?.StudentIdNo,
        employee_id = u.Teacher?.EmployeeId
    };
}