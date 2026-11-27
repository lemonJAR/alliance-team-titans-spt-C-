using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SptApi.Dtos.Requests;
using SptApi.Services;

namespace SptApi.Controllers;

[Route("api/auth/notifications")]
[Authorize]
public class NotificationsController(INotificationInboxService inbox) : ApiControllerBase
{
    // GET /api/auth/notifications?unread=1
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? unread) =>
        Respond(await inbox.GetAsync(unreadOnly: unread is "1" or "true"));

    // PATCH /api/auth/notifications   { mark_all: true }  or  { ids: [1, 2] }
    [HttpPatch]
    public async Task<IActionResult> MarkRead([FromBody] MarkReadRequest request) =>
        Respond(await inbox.MarkReadAsync(request));
}
