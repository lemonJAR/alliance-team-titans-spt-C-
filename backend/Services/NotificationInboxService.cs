using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Mappers;
using SptApi.Repositories;

namespace SptApi.Services;

// Students and professors see their own notifications. Admins see everyone's, as a log, with the recipient's email.
public class NotificationInboxService(INotificationRepository notifications, ICurrentUser currentUser) : INotificationInboxService
{
    public async Task<ServiceResult> GetAsync(bool unreadOnly)
    {
        var isAdmin = currentUser.IsAdmin;
        if (!isAdmin && currentUser.UserId is null) return ServiceResult.Unauthorized();

        var rows = await notifications.GetAsync(isAdmin ? null : currentUser.UserId, unreadOnly, isAdmin ? 500 : 200);
        return ServiceResult.Ok(rows.Select(n => ActivityMapper.ToDto(n, includeRecipient: isAdmin)));
    }

    // Only ever touches the caller's own notifications, even for admins.
    public async Task<ServiceResult> MarkReadAsync(MarkReadRequest request)
    {
        if (currentUser.UserId is not int userId) return ServiceResult.Unauthorized();

        IReadOnlyCollection<int>? ids = null;
        if (request.MarkAll != true)
        {
            ids = (request.Ids ?? []).Distinct().ToList();
            if (ids.Count == 0) return ServiceResult.BadRequest("Send mark_all: true or a list of ids.");
        }

        var updated = await notifications.MarkReadAsync(userId, ids);
        return ServiceResult.Ok(new { updated });
    }
}
