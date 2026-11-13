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
        // An audit failure must never turn a successful request (data already saved) into a 500.
        try
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
                CreatedAt = DateTime.UtcNow      // all timestamps in the system are UTC
            });

            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Audit] Could not write audit log '{action}': {ex.Message}");
        }
    }
}