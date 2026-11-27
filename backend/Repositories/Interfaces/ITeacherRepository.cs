using SptApi.Models;

namespace SptApi.Repositories;

public interface ITeacherRepository
{
    Task<Teacher?> GetByUserIdAsync(int userId);
    Task<Teacher?> GetByUserIdWithDetailsAsync(int userId);    // includes User and College
    Task<Teacher?> GetByIdWithUserAsync(int id);
    Task<Teacher?> GetByIdWithSubjectsAsync(int id);
    Task<List<Teacher>> GetAllWithDetailsAsync();
    Task<bool> EmployeeIdExistsAsync(string employeeId);
    Task<List<string>> GetEmployeeIdsStartingWithAsync(string prefix);
    Task<List<int>> GetUserIdsByEmployeeIdAsync(string employeeId);
    Task AddAsync(Teacher teacher);
    Task UpdateAsync(Teacher teacher);
}
