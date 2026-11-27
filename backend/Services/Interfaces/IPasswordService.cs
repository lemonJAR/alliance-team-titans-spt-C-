using SptApi.Common;
using SptApi.Dtos.Requests;

namespace SptApi.Services;

// Forgot / reset / change password.
public interface IPasswordService
{
    Task<ServiceResult> RequestResetAsync(EmailRequest request);
    Task<ServiceResult> ResetAsync(ResetPasswordRequest request);
    Task<ServiceResult> ChangeAsync(ChangePasswordRequest request);
}
