using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;

namespace SptApi.Repositories;

public class NotificationRepository(SptDbContext db) : INotificationRepository
{
    public Task<List<Notification>> GetAsync(int? userId, bool unreadOnly, int limit)
    {
        var q = db.Notifications.Include(n => n.User).AsQueryable();
        if (userId != null) q = q.Where(n => n.UserId == userId);
        if (unreadOnly) q = q.Where(n => !n.IsRead);
        return q.OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id).Take(limit).ToListAsync();
    }

    public async Task AddAsync(Notification notification)
    {
        db.Notifications.Add(notification);
        await db.SaveChangesAsync();
    }

    public async Task AddRangeAsync(IEnumerable<Notification> notifications)
    {
        db.Notifications.AddRange(notifications);
        await db.SaveChangesAsync();
    }

    public Task<int> MarkReadAsync(int userId, IReadOnlyCollection<int>? ids)
    {
        var q = db.Notifications.Where(n => n.UserId == userId && !n.IsRead);
        if (ids != null) q = q.Where(n => ids.Contains(n.Id));
        return q.ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true));
    }
}
