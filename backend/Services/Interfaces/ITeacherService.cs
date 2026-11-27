using SptApi.Common;
using SptApi.Dtos.Requests;

namespace SptApi.Services;

// Admin: faculty accounts.
public interface ITeacherService
{
    Task<ServiceResult> GetAllAsync();
    Task<ServiceResult> CreateAsync(AdminCreateTeacherRequest request);
    Task<ServiceResult> UpdateSubjectsAsync(int teacherId, UpdateTeacherSubjectsRequest request);
}
