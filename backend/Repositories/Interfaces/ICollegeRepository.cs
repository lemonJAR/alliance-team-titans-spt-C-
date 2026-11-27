using SptApi.Models;

namespace SptApi.Repositories;

public interface ICollegeRepository
{
    Task<List<College>> GetAllAsync();
    Task<bool> ExistsAsync(int id);
    Task<bool> CodeExistsAsync(string code);
    Task AddAsync(College college);
}
