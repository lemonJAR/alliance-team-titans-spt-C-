using SptApi.Common;
using SptApi.Dtos.Requests;

namespace SptApi.Services;

// Maximum units a student may take per program / year level / semester.
public interface ISemesterLoadService
{
    Task<ServiceResult> GetAllAsync(int? programId);
    Task<ServiceResult> SetAsync(SemesterLoadRequest request);   // creates, or updates the existing one
}
