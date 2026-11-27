using SptApi.Models;

namespace SptApi.Repositories;

public interface IProgramRepository
{
    Task<List<AcademicProgram>> GetAllAsync(int? collegeId);   // includes College
    Task<bool> ExistsAsync(int id);
    Task<bool> CodeExistsAsync(string code);
    Task AddAsync(AcademicProgram program);
}
