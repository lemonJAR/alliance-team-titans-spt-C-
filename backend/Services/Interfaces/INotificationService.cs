namespace SptApi.Services;

// Creates in-app notifications. Never throws: the change that triggered it is already saved.
public interface INotificationService
{
    Task NotifyAsync(int? userId, string message);
    Task NotifyManyAsync(IEnumerable<(int UserId, string Message)> items);
}
