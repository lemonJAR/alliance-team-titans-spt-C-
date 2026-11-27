using SptApi.Common;
using SptApi.Dtos.Requests;

namespace SptApi.Services;

public interface ISubjectService
{
    Task<ServiceResult> GetAllAsync(int? programId, int? collegeId);
    Task<ServiceResult> CreateAsync(SubjectRequest request);
}
