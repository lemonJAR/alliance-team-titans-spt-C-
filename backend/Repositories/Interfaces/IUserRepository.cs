using SptApi.Models;

namespace SptApi.Repositories;

public interface IUserRepository
{
    Task<User?> GetByIdAsync(int id);
    Task<User?> GetByIdWithProfilesAsync(int id);          // includes Student and Teacher
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByEmailWithProfilesAsync(string email);
    Task<bool> EmailExistsAsync(string email);
    Task<bool> AdminExistsAsync();
    Task<bool> IsActiveAsync(int id);                      // false when inactive or missing
    Task<Dictionary<int, string>> GetDisplayNamesAsync(IEnumerable<int> ids);
    Task AddAsync(User user);
    Task UpdateAsync(User user);
    Task SoftDeleteAsync(User user);                       // marks the account inactive; nothing is removed
}
