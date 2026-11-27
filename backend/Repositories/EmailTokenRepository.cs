using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;

namespace SptApi.Repositories;

public class EmailTokenRepository(SptDbContext db) : IEmailTokenRepository
{
    public Task<EmailToken?> GetByHashAsync(string tokenHash, string purpose) =>
        db.EmailTokens.Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == tokenHash && t.Purpose == purpose);

    public Task<EmailToken?> GetValidByHashAsync(string tokenHash, string purpose) =>
        db.EmailTokens.Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == tokenHash && t.Purpose == purpose
                                      && t.UsedAt == null && t.ExpiresAt > DateTime.UtcNow);

    public Task<List<EmailToken>> GetUnusedAsync(int userId, string purpose) =>
        db.EmailTokens.Where(t => t.UserId == userId && t.Purpose == purpose && t.UsedAt == null).ToListAsync();

    public async Task AddAsync(EmailToken token)
    {
        db.EmailTokens.Add(token);
        await db.SaveChangesAsync();
    }

    public async Task UpdateAsync(EmailToken token)
    {
        db.TrackForUpdate(token);
        await db.SaveChangesAsync();
    }

    public async Task UpdateRangeAsync(IEnumerable<EmailToken> tokens)
    {
        db.TrackForUpdate(tokens);
        await db.SaveChangesAsync();
    }
}
