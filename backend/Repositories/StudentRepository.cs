using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;

namespace SptApi.Repositories;

public class StudentRepository(SptDbContext db) : IStudentRepository
{
    public Task<int> CountAsync() => db.Students.CountAsync();

    public Task<Student?> GetByIdAsync(int id) =>
        db.Students.FirstOrDefaultAsync(s => s.Id == id);

    public Task<Student?> GetByUserIdAsync(int userId) =>
        db.Students.FirstOrDefaultAsync(s => s.UserId == userId);

    public Task<Student?> GetByUserIdWithDetailsAsync(int userId) =>
        db.Students.Include(s => s.User).Include(s => s.Program).FirstOrDefaultAsync(s => s.UserId == userId);

    public Task<Student?> GetByStudentIdNoAsync(string studentIdNo) =>
        db.Students.FirstOrDefaultAsync(s => s.StudentIdNo == studentIdNo);

    public Task<bool> StudentIdNoExistsAsync(string studentIdNo) =>
        db.Students.AnyAsync(s => s.StudentIdNo == studentIdNo);

    public Task<List<Student>> GetAllWithDetailsAsync() =>
        db.Students.Include(s => s.User).Include(s => s.Program)
            .OrderBy(s => s.StudentIdNo).ToListAsync();

    public Task<List<string>> GetStudentIdNumbersStartingWithAsync(string prefix) =>
        db.Students.Where(s => s.StudentIdNo.StartsWith(prefix)).Select(s => s.StudentIdNo).ToListAsync();

    public Task<List<int>> GetUserIdsByStudentIdNoAsync(string studentIdNo) =>
        db.Students.Where(s => s.StudentIdNo == studentIdNo && s.UserId != null)
            .Select(s => s.UserId!.Value).ToListAsync();

    public async Task AddAsync(Student student)
    {
        db.Students.Add(student);
        await db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Student student)
    {
        db.TrackForUpdate(student);
        await db.SaveChangesAsync();
    }

    public async Task DeleteAsync(Student student)
    {
        db.Students.Remove(student);
        await db.SaveChangesAsync();
    }
}
