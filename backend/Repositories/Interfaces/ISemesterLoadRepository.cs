using SptApi.Models;

namespace SptApi.Repositories;

public interface ISemesterLoadRepository
{
    Task<List<SemesterLoad>> GetAllAsync(int? programId);   // includes Program and its College
    Task<SemesterLoad?> FindAsync(int programId, int yearLevel, int semester);
    Task AddAsync(SemesterLoad load);
    Task UpdateAsync(SemesterLoad load);
}
