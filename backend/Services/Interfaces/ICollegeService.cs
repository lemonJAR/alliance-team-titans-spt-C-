using SptApi.Common;
using SptApi.Dtos.Requests;

namespace SptApi.Services;

public interface ICollegeService
{
    Task<ServiceResult> GetAllAsync();
    Task<ServiceResult> CreateAsync(CollegeRequest request);
}
