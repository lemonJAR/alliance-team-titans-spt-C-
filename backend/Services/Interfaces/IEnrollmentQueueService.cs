using SptApi.Common;
using SptApi.Dtos.Requests;

namespace SptApi.Services;

// Admin side of enrollment: approve or reject requests.
public interface IEnrollmentQueueService
{
    Task<ServiceResult> GetQueueAsync(string? status);
    Task<ServiceResult> DecideAsync(QueueActionRequest request);
}
