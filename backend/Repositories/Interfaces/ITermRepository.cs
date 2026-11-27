using SptApi.Models;

namespace SptApi.Repositories;

public interface ITermRepository
{
    Task<List<AcademicTerm>> GetAllAsync();      // newest first
    Task<AcademicTerm?> GetByIdAsync(int id);
    Task<AcademicTerm?> GetActiveAsync();
    Task<bool> ExistsAsync(string schoolYear, int semester, int? excludeId = null);
    Task DeactivateAllAsync();
    Task AddAsync(AcademicTerm term);
    Task UpdateAsync(AcademicTerm term);
}
