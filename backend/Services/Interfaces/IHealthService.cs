using SptApi.Common;

namespace SptApi.Services;

public interface IHealthService
{
    Task<ServiceResult> CheckAsync();
}
