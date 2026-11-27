using SptApi.Common;
using SptApi.Dtos.Requests;

namespace SptApi.Services;

// Role-specific profile pages. Users may edit their own name; email, role and ID numbers are admin-managed.
public interface IProfileService
{
    Task<ServiceResult> GetStudentAsync();
    Task<ServiceResult> UpdateStudentAsync(UpdateNameRequest request);
    Task<ServiceResult> GetTeacherAsync();
    Task<ServiceResult> UpdateTeacherAsync(UpdateNameRequest request);
    Task<ServiceResult> GetAdminAsync();
    Task<ServiceResult> UpdateAdminAsync(UpdateNameRequest request);
    Task<ServiceResult> UpdatePushTokenAsync(FcmTokenRequest request);
}
