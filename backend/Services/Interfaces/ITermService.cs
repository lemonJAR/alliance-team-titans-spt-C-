using SptApi.Common;
using SptApi.Dtos.Requests;

namespace SptApi.Services;

// Academic terms. Exactly one term is active at a time.
public interface ITermService
{
    Task<ServiceResult> GetAllAsync();
    Task<ServiceResult> CreateAsync(TermRequest request);
    Task<ServiceResult> UpdateAsync(int termId, TermRequest request);
}
