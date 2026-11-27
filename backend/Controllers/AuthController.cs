using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SptApi.Dtos.Requests;
using SptApi.Services;

namespace SptApi.Controllers;

[Route("api/auth")]
public class AuthController(IAuthService auth) : ApiControllerBase
{
    // POST /api/auth/login
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request) =>
        Respond(await auth.LoginAsync(request));

    // POST /api/auth/logout
    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout() =>
        Respond(await auth.LogoutAsync());

    // GET /api/auth/me
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me() =>
        Respond(await auth.GetMeAsync());

    // PATCH /api/auth/me   (name only; email and role can't be self-edited)
    [HttpPatch("me")]
    [Authorize]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateNameRequest request) =>
        Respond(await auth.UpdateMeAsync(request));
}
