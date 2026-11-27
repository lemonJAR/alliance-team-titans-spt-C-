using SptApi.Models;

namespace SptApi.Repositories;

public interface IStudentRepository
{
    Task<int> CountAsync();
    Task<Student?> GetByIdAsync(int id);
    Task<Student?> GetByUserIdAsync(int userId);
    Task<Student?> GetByUserIdWithDetailsAsync(int userId);    // includes User and Program
    Task<Student?> GetByStudentIdNoAsync(string studentIdNo);
    Task<bool> StudentIdNoExistsAsync(string studentIdNo);
    Task<List<Student>> GetAllWithDetailsAsync();
    Task<List<string>> GetStudentIdNumbersStartingWithAsync(string prefix);
    Task<List<int>> GetUserIdsByStudentIdNoAsync(string studentIdNo);
    Task AddAsync(Student student);
    Task UpdateAsync(Student student);
    Task DeleteAsync(Student student);       // only for pre-loaded IDs that never had an account or enrollment
}
