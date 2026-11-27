using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SptApi.Dtos.Requests;
using SptApi.Services;

namespace SptApi.Controllers;

// Sign-up, email verification and passwords.
[Route("api/auth")]
public class AccountController(IRegistrationService registration, IPasswordService passwords) : ApiControllerBase
{
    // POST /api/auth/verify-student   -> { exists: true/false }
    [HttpPost("verify-student")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyStudent([FromBody] VerifyStudentRequest request) =>
        Respond(await registration.CheckStudentIdAsync(request));

    // POST /api/auth/register
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request) =>
        Respond(await registration.RegisterAsync(request));

    // GET /api/auth/verify-email/{token}
    [HttpGet("verify-email/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyEmail(string token) =>
        Respond(await registration.VerifyEmailAsync(token));

    // POST /api/auth/resend-verification
    [HttpPost("resend-verification")]
    [AllowAnonymous]
    public async Task<IActionResult> ResendVerification([FromBody] EmailRequest request) =>
        Respond(await registration.ResendVerificationAsync(request));

    // POST /api/auth/password/forgot
    [HttpPost("password/forgot")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] EmailRequest request) =>
        Respond(await passwords.RequestResetAsync(request));

    // POST /api/auth/password/reset   { token, new_password }
    [HttpPost("password/reset")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request) =>
        Respond(await passwords.ResetAsync(request));

    // POST /api/auth/password/change   { current_password, new_password }
    [HttpPost("password/change")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request) =>
        Respond(await passwords.ChangeAsync(request));
}
