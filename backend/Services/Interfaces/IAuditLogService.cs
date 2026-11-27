using SptApi.Common;

namespace SptApi.Services;

// Admin: searching the audit log.
public interface IAuditLogService
{
    Task<ServiceResult> SearchAsync(string? action, string? actorType, string? actorIdNumber, string? email);
}
