using SptApi.Common;
using SptApi.Dtos.Requests;

namespace SptApi.Services;

// Admin: any account (activate, deactivate, rename, soft delete).
public interface IUserAccountService
{
    Task<ServiceResult> UpdateAsync(int userId, AdminUpdateUserRequest request);
    Task<ServiceResult> SoftDeleteAsync(int userId);
}
