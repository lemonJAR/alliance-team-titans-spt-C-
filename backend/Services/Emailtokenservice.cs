using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;

namespace SptApi.Services;

// Creates the one-time links used for email verification and password reset.
// The database stores only a SHA-256 hash of each token, so a leaked database
// can't be used to reset anyone's password.
public class EmailTokenService(SptDbContext db)
{
    public const string Verify = "VERIFY_EMAIL";
    public const string Reset = "RESET_PASSWORD";

    public static string Hash(string raw) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw))).ToLowerInvariant();

    // Returns the raw token to put in the link. Older unused tokens of the same kind are cancelled.
    public async Task<string> IssueAsync(int userId, string purpose, TimeSpan lifetime)
    {
        var old = await db.EmailTokens
            .Where(t => t.UserId == userId && t.Purpose == purpose && t.UsedAt == null)
            .ToListAsync();
        foreach (var t in old) t.UsedAt = DateTime.Now;

        var raw = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        db.EmailTokens.Add(new EmailToken
        {
            UserId = userId,
            Token = Hash(raw),
            Purpose = purpose,
            ExpiresAt = DateTime.Now.Add(lifetime)
        });
        await db.SaveChangesAsync();
        return raw;
    }

    // Finds a token that is unused and not expired.
    public Task<EmailToken?> FindValidAsync(string raw, string purpose)
    {
        var hash = Hash(raw);
        return db.EmailTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == hash && t.Purpose == purpose
                                      && t.UsedAt == null && t.ExpiresAt > DateTime.Now);
    }
}