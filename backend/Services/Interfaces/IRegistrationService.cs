using SptApi.Common;
using SptApi.Dtos.Requests;

namespace SptApi.Services;

// Self sign-up and email verification.
public interface IRegistrationService
{
    Task<ServiceResult> CheckStudentIdAsync(VerifyStudentRequest request);
    Task<ServiceResult> RegisterAsync(RegisterRequest request);
    Task<ServiceResult> VerifyEmailAsync(string token);
    Task<ServiceResult> ResendVerificationAsync(EmailRequest request);
}
