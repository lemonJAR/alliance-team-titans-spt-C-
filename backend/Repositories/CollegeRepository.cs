using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;

namespace SptApi.Repositories;

public class CollegeRepository(SptDbContext db) : ICollegeRepository
{
    public Task<List<College>> GetAllAsync() =>
        db.Colleges.OrderBy(c => c.Code).ToListAsync();

    public Task<bool> ExistsAsync(int id) =>
        db.Colleges.AnyAsync(c => c.Id == id);

    public Task<bool> CodeExistsAsync(string code) =>
        db.Colleges.AnyAsync(c => c.Code == code);

    public async Task AddAsync(College college)
    {
        db.Colleges.Add(college);
        await db.SaveChangesAsync();
    }
}
