using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Services;

namespace SptApi.Controllers;

[Route("api/auth")]
[Authorize]
public class ProfileController(IProfileService profiles) : ApiControllerBase
{
    // GET /api/auth/profile/student
    [HttpGet("profile/student")]
    [Authorize(Roles = Roles.Student)]
    public async Task<IActionResult> GetStudent() =>
        Respond(await profiles.GetStudentAsync());

    // PATCH /api/auth/profile/student
    [HttpPatch("profile/student")]
    [Authorize(Roles = Roles.Student)]
    public async Task<IActionResult> UpdateStudent([FromBody] UpdateNameRequest request) =>
        Respond(await profiles.UpdateStudentAsync(request));

    // GET /api/auth/profile/teacher
    [HttpGet("profile/teacher")]
    [Authorize(Roles = Roles.Professor)]
    public async Task<IActionResult> GetTeacher() =>
        Respond(await profiles.GetTeacherAsync());

    // PATCH /api/auth/profile/teacher
    [HttpPatch("profile/teacher")]
    [Authorize(Roles = Roles.Professor)]
    public async Task<IActionResult> UpdateTeacher([FromBody] UpdateNameRequest request) =>
        Respond(await profiles.UpdateTeacherAsync(request));

    // GET /api/auth/profile/admin
    [HttpGet("profile/admin")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> GetAdmin() =>
        Respond(await profiles.GetAdminAsync());

    // PATCH /api/auth/profile/admin
    [HttpPatch("profile/admin")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> UpdateAdmin([FromBody] UpdateNameRequest request) =>
        Respond(await profiles.UpdateAdminAsync(request));

    // PATCH /api/auth/me/fcm-token   { fcm_token }
    [HttpPatch("me/fcm-token")]
    public async Task<IActionResult> UpdateFcmToken([FromBody] FcmTokenRequest request) =>
        Respond(await profiles.UpdatePushTokenAsync(request));
}
