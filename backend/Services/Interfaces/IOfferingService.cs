using SptApi.Common;
using SptApi.Dtos.Queries;
using SptApi.Dtos.Requests;

namespace SptApi.Services;

// Class offerings (sections): a subject taught in a term with a schedule, room, teacher and slots.
public interface IOfferingService
{
    Task<ServiceResult> GetAllAsync(OfferingFilter filter);
    Task<ServiceResult> CreateAsync(OfferingRequest request);
    Task<ServiceResult> GetMineAsync(int? termId);                 // professor's own sections
    Task<ServiceResult> GetMyClassListAsync(int offeringId);       // students in one of the professor's sections
}
