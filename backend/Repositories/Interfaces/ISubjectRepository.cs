using SptApi.Models;

namespace SptApi.Repositories;

public interface ISubjectRepository
{
    Task<Subject?> GetByIdAsync(int id);
    Task<List<Subject>> GetFilteredAsync(int? programId, int? collegeId);   // includes Program, College, Prerequisites
    Task<List<Subject>> GetByIdsAsync(IEnumerable<int> ids);
    Task<Dictionary<int, Subject>> GetByIdsWithPrerequisitesAsync(IEnumerable<int> ids);
    Task<List<Subject>> GetCurriculumAsync(int programId, int yearLevel, int semester);   // includes Prerequisites
    Task<List<Subject>> GetByProgramIdsAsync(IEnumerable<int> programIds);
    Task<bool> CodeExistsInProgramAsync(int programId, string code);
    Task AddAsync(Subject subject);
}
