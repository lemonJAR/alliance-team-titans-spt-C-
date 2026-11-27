using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

public class NotificationService(INotificationRepository notifications) : INotificationService
{
    public Task NotifyAsync(int? userId, string message) =>
        userId is int uid ? NotifyManyAsync([(uid, message)]) : Task.CompletedTask;

    public async Task NotifyManyAsync(IEnumerable<(int UserId, string Message)> items)
    {
        var rows = items.Select(i => new Notification
        {
            UserId = i.UserId,
            Message = i.Message,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        }).ToList();
        if (rows.Count == 0) return;

        try { await notifications.AddRangeAsync(rows); }
        catch (Exception ex) { Console.WriteLine($"[Notify] Could not save notification: {ex.Message}"); }
    }
}
