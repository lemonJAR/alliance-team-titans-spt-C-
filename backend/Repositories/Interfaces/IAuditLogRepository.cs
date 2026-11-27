using SptApi.Dtos.Queries;
using SptApi.Models;

namespace SptApi.Repositories;

public interface IAuditLogRepository
{
    Task<List<AuditLog>> SearchAsync(AuditLogFilter filter, int limit);
    Task AddAsync(AuditLog entry);
}
