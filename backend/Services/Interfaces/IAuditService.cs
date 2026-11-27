namespace SptApi.Services;

// Writes a row to audit_logs. Never throws: a failed audit must not undo a successful request.
public interface IAuditService
{
    Task LogAsync(string action, string? entity = null, int? entityId = null, string? details = null,
        int? actorId = null, string? email = null, string? role = null);
}
