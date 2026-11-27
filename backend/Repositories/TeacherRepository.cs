using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;

namespace SptApi.Repositories;

public class TeacherRepository(SptDbContext db) : ITeacherRepository
{
    public Task<Teacher?> GetByUserIdAsync(int userId) =>
        db.Teachers.FirstOrDefaultAsync(t => t.UserId == userId);

    public Task<Teacher?> GetByUserIdWithDetailsAsync(int userId) =>
        db.Teachers.Include(t => t.User).Include(t => t.College).FirstOrDefaultAsync(t => t.UserId == userId);

    public Task<Teacher?> GetByIdWithUserAsync(int id) =>
        db.Teachers.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == id);

    public Task<Teacher?> GetByIdWithSubjectsAsync(int id) =>
        db.Teachers.Include(t => t.Subjects).FirstOrDefaultAsync(t => t.Id == id);

    public Task<List<Teacher>> GetAllWithDetailsAsync() =>
        db.Teachers
            .Include(t => t.User)
            .Include(t => t.College)
            .Include(t => t.Subjects)
            .OrderBy(t => t.User.LastName).ThenBy(t => t.User.FirstName)
            .ToListAsync();

    public Task<bool> EmployeeIdExistsAsync(string employeeId) =>
        db.Teachers.AnyAsync(t => t.EmployeeId == employeeId);

    public Task<List<string>> GetEmployeeIdsStartingWithAsync(string prefix) =>
        db.Teachers.Where(t => t.EmployeeId.StartsWith(prefix)).Select(t => t.EmployeeId).ToListAsync();

    public Task<List<int>> GetUserIdsByEmployeeIdAsync(string employeeId) =>
        db.Teachers.Where(t => t.EmployeeId == employeeId).Select(t => t.UserId).ToListAsync();

    public async Task AddAsync(Teacher teacher)
    {
        db.Teachers.Add(teacher);
        await db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Teacher teacher)
    {
        db.TrackForUpdate(teacher);
        await db.SaveChangesAsync();
    }
}
