using SptApi.Dtos.Queries;
using SptApi.Models;

namespace SptApi.Repositories;

public interface IOfferingRepository
{
    Task<Offering?> GetByIdAsync(int id);
    Task<Offering?> GetByIdWithDetailsAsync(int id);       // includes Term, Subject.Program, Teacher.User
    Task<List<Offering>> GetFilteredAsync(OfferingFilter filter);
    Task<List<Offering>> GetForTeacherAsync(int teacherId, int? termId);   // null term = active term
    Task<List<Offering>> GetForSubjectsInTermAsync(int termId, IEnumerable<int> subjectIds);
    Task<bool> IsOwnedByTeacherAsync(int offeringId, int teacherId);
    Task<int> CountForSubjectInTermAsync(int termId, int subjectId);
    Task<bool> CodeExistsAsync(string offerCode);
    // Takes one seat with a single conditional UPDATE so two students can't both grab the last one.
    Task<bool> TryClaimSlotAsync(int offeringId);
    Task AddAsync(Offering offering);
}
