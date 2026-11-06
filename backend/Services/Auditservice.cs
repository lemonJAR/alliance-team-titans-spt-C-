using SptApi.Data;
using SptApi.Models;

namespace SptApi.Services;

// Writes a row to audit_logs. Used by every controller that changes data
// (WBS: "Audit Log/Modification History - track all changes with user & timestamp").
public class AuditService(SptDbContext db, IHttpContextAccessor http)
{
    public async Task LogAsync(
        string action, string? entity = null, int? entityId = null, string? details = null,
        int? actorId = null, string? email = null, string? role = null)
    {
        var ctx = http.HttpContext;

        db.AuditLogs.Add(new AuditLog
        {
            ActorId = actorId ?? ctx?.User.UserId(),
            UserEmail = email ?? ctx?.User.UserEmail(),
            ActorType = role ?? ctx?.User.UserRole(),
            Action = action,
            Entity = entity,
            EntityId = entityId,
            Details = details,
            IpAddress = ctx?.Connection.RemoteIpAddress?.ToString(),
            CreatedAt = DateTime.Now
        });

        await db.SaveChangesAsync();
    }
}