using SptApi.Models;

namespace SptApi.Repositories;

public interface INotificationRepository
{
    // userId null = everyone's notifications (admin log view).
    Task<List<Notification>> GetAsync(int? userId, bool unreadOnly, int limit);
    Task AddAsync(Notification notification);
    Task AddRangeAsync(IEnumerable<Notification> notifications);
    Task<int> MarkReadAsync(int userId, IReadOnlyCollection<int>? ids);   // null ids = all of the user's unread
}
