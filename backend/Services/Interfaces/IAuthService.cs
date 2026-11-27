using SptApi.Common;
using SptApi.Dtos.Requests;

namespace SptApi.Services;

// Sign in / sign out and the logged-in user's own session info.
public interface IAuthService
{
    Task<ServiceResult> LoginAsync(LoginRequest request);
    Task<ServiceResult> LogoutAsync();
    Task<ServiceResult> GetMeAsync();
    Task<ServiceResult> UpdateMeAsync(UpdateNameRequest request);
}
