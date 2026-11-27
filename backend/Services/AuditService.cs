using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

// Records who changed what and when (WBS: "Audit Log/Modification History").
public class AuditService(IAuditLogRepository logs, ICurrentUser currentUser) : IAuditService
{
    public async Task LogAsync(
        string action, string? entity = null, int? entityId = null, string? details = null,
        int? actorId = null, string? email = null, string? role = null)
    {
        try
        {
            await logs.AddAsync(new AuditLog
            {
                ActorId = actorId ?? currentUser.UserId,
                UserEmail = email ?? currentUser.Email,
                ActorType = role ?? currentUser.Role,
                Action = action,
                Entity = entity,
                EntityId = entityId,
                Details = details,
                CreatedAt = DateTime.UtcNow      // all timestamps in the system are UTC
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[Audit] Could not write audit log '{action}': {ex.Message}");
        }
    }
}
