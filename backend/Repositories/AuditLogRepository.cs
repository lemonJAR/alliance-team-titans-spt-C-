using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Dtos.Queries;
using SptApi.Models;

namespace SptApi.Repositories;

public class AuditLogRepository(SptDbContext db) : IAuditLogRepository
{
    public Task<List<AuditLog>> SearchAsync(AuditLogFilter filter, int limit)
    {
        var q = db.AuditLogs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Action))
            q = q.Where(l => l.Action.Contains(filter.Action));
        if (!string.IsNullOrWhiteSpace(filter.ActorType))
            q = q.Where(l => l.ActorType == filter.ActorType);
        if (!string.IsNullOrWhiteSpace(filter.Email))
            q = q.Where(l => l.UserEmail != null && l.UserEmail.Contains(filter.Email));
        if (filter.ActorUserIds != null)
        {
            var ids = filter.ActorUserIds;
            q = q.Where(l => l.ActorId != null && ids.Contains(l.ActorId.Value));
        }

        return q.OrderByDescending(l => l.CreatedAt).ThenByDescending(l => l.Id).Take(limit).ToListAsync();
    }

    public async Task AddAsync(AuditLog entry)
    {
        db.AuditLogs.Add(entry);
        await db.SaveChangesAsync();
    }
}
