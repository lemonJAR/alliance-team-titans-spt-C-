using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;

namespace SptApi.Repositories;

public class SubjectRepository(SptDbContext db) : ISubjectRepository
{
    public Task<Subject?> GetByIdAsync(int id) =>
        db.Subjects.FirstOrDefaultAsync(s => s.Id == id);

    public Task<List<Subject>> GetFilteredAsync(int? programId, int? collegeId)
    {
        var q = db.Subjects
            .Include(s => s.Program).ThenInclude(p => p.College)
            .Include(s => s.Prerequisites)
            .AsQueryable();

        if (programId != null) q = q.Where(s => s.ProgramId == programId);
        if (collegeId != null) q = q.Where(s => s.Program.CollegeId == collegeId);

        return q.OrderBy(s => s.Program.Code).ThenBy(s => s.YearLevel).ThenBy(s => s.Semester).ThenBy(s => s.Code)
            .ToListAsync();
    }

    public Task<List<Subject>> GetByIdsAsync(IEnumerable<int> ids)
    {
        var list = ids.ToList();
        return db.Subjects.Where(s => list.Contains(s.Id)).ToListAsync();
    }

    public Task<Dictionary<int, Subject>> GetByIdsWithPrerequisitesAsync(IEnumerable<int> ids)
    {
        var list = ids.ToList();
        return db.Subjects.Include(s => s.Prerequisites)
            .Where(s => list.Contains(s.Id)).ToDictionaryAsync(s => s.Id);
    }

    public Task<List<Subject>> GetCurriculumAsync(int programId, int yearLevel, int semester) =>
        db.Subjects
            .Include(s => s.Prerequisites)
            .Where(s => s.ProgramId == programId && s.YearLevel == yearLevel && s.Semester == semester)
            .OrderBy(s => s.Code)
            .ToListAsync();

    public Task<List<Subject>> GetByProgramIdsAsync(IEnumerable<int> programIds)
    {
        var list = programIds.ToList();
        return db.Subjects.Where(s => list.Contains(s.ProgramId)).ToListAsync();
    }

    public Task<bool> CodeExistsInProgramAsync(int programId, string code) =>
        db.Subjects.AnyAsync(s => s.ProgramId == programId && s.Code == code);

    public async Task AddAsync(Subject subject)
    {
        db.Subjects.Add(subject);
        await db.SaveChangesAsync();
    }
}
