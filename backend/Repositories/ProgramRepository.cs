using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;

namespace SptApi.Repositories;

public class ProgramRepository(SptDbContext db) : IProgramRepository
{
    public Task<List<AcademicProgram>> GetAllAsync(int? collegeId)
    {
        var q = db.Programs.Include(p => p.College).AsQueryable();
        if (collegeId != null) q = q.Where(p => p.CollegeId == collegeId);
        return q.OrderBy(p => p.Code).ToListAsync();
    }

    public Task<bool> ExistsAsync(int id) =>
        db.Programs.AnyAsync(p => p.Id == id);

    public Task<bool> CodeExistsAsync(string code) =>
        db.Programs.AnyAsync(p => p.Code == code);

    public async Task AddAsync(AcademicProgram program)
    {
        db.Programs.Add(program);
        await db.SaveChangesAsync();
    }
}
