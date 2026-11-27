using SptApi.Common;
using SptApi.Dtos.Requests;

namespace SptApi.Services;

public interface INotificationInboxService
{
    Task<ServiceResult> GetAsync(bool unreadOnly);
    Task<ServiceResult> MarkReadAsync(MarkReadRequest request);
}
