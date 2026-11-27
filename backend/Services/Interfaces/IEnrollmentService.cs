using SptApi.Common;
using SptApi.Dtos.Requests;

namespace SptApi.Services;

// Student side of enrollment: request subjects, then pick a section once approved.
public interface IEnrollmentService
{
    Task<ServiceResult> GetProspectusAsync();
    Task<ServiceResult> RequestSubjectsAsync(SubjectRequestBody request);
    Task<ServiceResult> GetApprovedSubjectsAsync();
    Task<ServiceResult> SelectSectionAsync(SelectScheduleRequest request);
}
