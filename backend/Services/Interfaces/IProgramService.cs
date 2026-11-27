using SptApi.Common;
using SptApi.Dtos.Requests;

namespace SptApi.Services;

public interface IProgramService
{
    Task<ServiceResult> GetAllAsync(int? collegeId);
    Task<ServiceResult> CreateAsync(ProgramRequest request);
}
