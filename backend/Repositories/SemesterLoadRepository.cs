using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;

namespace SptApi.Repositories;

public class SemesterLoadRepository(SptDbContext db) : ISemesterLoadRepository
{
    public Task<List<SemesterLoad>> GetAllAsync(int? programId)
    {
        var q = db.SemesterLoads.Include(l => l.Program).ThenInclude(p => p.College).AsQueryable();
        if (programId != null) q = q.Where(l => l.ProgramId == programId);
        return q.OrderBy(l => l.Program.College.Code).ThenBy(l => l.Program.Code)
            .ThenBy(l => l.YearLevel).ThenBy(l => l.Semester)
            .ToListAsync();
    }

    public Task<SemesterLoad?> FindAsync(int programId, int yearLevel, int semester) =>
        db.SemesterLoads.FirstOrDefaultAsync(l =>
            l.ProgramId == programId && l.YearLevel == yearLevel && l.Semester == semester);

    public async Task AddAsync(SemesterLoad load)
    {
        db.SemesterLoads.Add(load);
        await db.SaveChangesAsync();
    }

    public async Task UpdateAsync(SemesterLoad load)
    {
        db.TrackForUpdate(load);
        await db.SaveChangesAsync();
    }
}
