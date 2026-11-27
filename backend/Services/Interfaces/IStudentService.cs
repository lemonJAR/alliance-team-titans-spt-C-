using SptApi.Common;
using SptApi.Dtos.Requests;

namespace SptApi.Services;

// Admin: student accounts and pre-loaded student IDs.
public interface IStudentService
{
    Task<ServiceResult> GetAllAsync();
    Task<ServiceResult> CreateAsync(AdminCreateStudentRequest request);
    Task<ServiceResult> RemoveUnregisteredAsync(int studentId);
}
