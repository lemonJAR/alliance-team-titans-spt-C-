using SptApi.Models;

namespace SptApi.Repositories;

public interface IEmailTokenRepository
{
    Task<EmailToken?> GetByHashAsync(string tokenHash, string purpose);          // includes User
    Task<EmailToken?> GetValidByHashAsync(string tokenHash, string purpose);     // unused and not expired; includes User
    Task<List<EmailToken>> GetUnusedAsync(int userId, string purpose);
    Task AddAsync(EmailToken token);
    Task UpdateAsync(EmailToken token);
    Task UpdateRangeAsync(IEnumerable<EmailToken> tokens);
}
