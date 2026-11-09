using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;
using SptApi.Services;

namespace SptApi.Controllers;

public class MarkReadRequest
{
    public bool? MarkAll { get; set; }
    public List<int>? Ids { get; set; }
}

// In-app notifications (rows are created by the enrollment and grade controllers).
// Students and professors see their own. Admins see everyone's, as a log, with the recipient's email.
[ApiController]
[Route("api/auth/notifications")]
[Authorize]
public class NotificationsController(SptDbContext db) : ControllerBase
{
    // GET /api/auth/notifications/?unread=1
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string? unread)
    {
        var q = db.Notifications.Include(n => n.User).AsQueryable();

        var isAdmin = User.UserRole() == Roles.Admin;
        var myId = User.UserId();
        if (!isAdmin) q = q.Where(n => n.UserId == myId);

        if (unread is "1" or "true") q = q.Where(n => !n.IsRead);

        var rows = await q.OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id)
            .Take(isAdmin ? 500 : 200).ToListAsync();

        return Ok(rows.Select(n =>
        {
            var category = CategoryOf(n.Message);
            return new
            {
                id = n.Id,
                message = n.Message,
                title = TitleOf(category),
                category,
                is_read = n.IsRead,
                created_at = n.CreatedAt,
                recipient_email = isAdmin ? n.User.Email : null
            };
        }));
    }

    // PATCH /api/auth/notifications/   { mark_all: true }  or  { ids: [1, 2] }
    // Only ever touches the caller's own notifications, even for admins.
    [HttpPatch]
    public async Task<IActionResult> MarkRead([FromBody] MarkReadRequest req)
    {
        var myId = User.UserId();
        var q = db.Notifications.Where(n => n.UserId == myId && !n.IsRead);

        if (req.MarkAll != true)
        {
            var ids = (req.Ids ?? []).Distinct().ToList();
            if (ids.Count == 0) return BadRequest(new { detail = "Send mark_all: true or a list of ids." });
            q = q.Where(n => ids.Contains(n.Id));
        }

        var updated = await q.ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
        return Ok(new { updated });
    }

    // The table stores only a message, so the admin page's category and title are worked out from the text.
    private static string CategoryOf(string message)
    {
        var m = message.ToLowerInvariant();
        if (m.Contains("grade")) return "GRADE";
        if (m.Contains("approved") || m.Contains("enroll") || m.Contains("schedule")) return "ENROLLMENT";
        return "SYSTEM";
    }

    private static string TitleOf(string category) => category switch
    {
        "GRADE" => "Grade update",
        "ENROLLMENT" => "Enrollment update",
        _ => "Notification"
    };
}