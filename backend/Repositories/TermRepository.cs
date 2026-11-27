using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;

namespace SptApi.Repositories;

public class TermRepository(SptDbContext db) : ITermRepository
{
    public Task<List<AcademicTerm>> GetAllAsync() =>
        db.AcademicTerms.OrderByDescending(t => t.SchoolYear).ThenByDescending(t => t.Semester).ToListAsync();

    public Task<AcademicTerm?> GetByIdAsync(int id) =>
        db.AcademicTerms.FirstOrDefaultAsync(t => t.Id == id);

    public Task<AcademicTerm?> GetActiveAsync() =>
        db.AcademicTerms.FirstOrDefaultAsync(t => t.IsActive);

    public Task<bool> ExistsAsync(string schoolYear, int semester, int? excludeId = null) =>
        db.AcademicTerms.AnyAsync(t => t.SchoolYear == schoolYear && t.Semester == semester
                                       && (excludeId == null || t.Id != excludeId));

    public Task DeactivateAllAsync() =>
        db.AcademicTerms.Where(t => t.IsActive).ExecuteUpdateAsync(s => s.SetProperty(t => t.IsActive, false));

    public async Task AddAsync(AcademicTerm term)
    {
        db.AcademicTerms.Add(term);
        await db.SaveChangesAsync();
    }

    public async Task UpdateAsync(AcademicTerm term)
    {
        db.TrackForUpdate(term);
        await db.SaveChangesAsync();
    }
}
