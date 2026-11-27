using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

// The database stores only a SHA-256 hash of each token, so a leaked database can't be used to reset passwords.
public class EmailTokenService(IEmailTokenRepository tokens) : IEmailTokenService
{
    private static string Hash(string raw) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(raw))).ToLowerInvariant();

    // Older unused tokens of the same kind are cancelled so only the newest link works.
    public async Task<string> IssueAsync(int userId, string purpose, TimeSpan lifetime)
    {
        var old = await tokens.GetUnusedAsync(userId, purpose);
        if (old.Count > 0)
        {
            foreach (var t in old) t.UsedAt = DateTime.UtcNow;
            await tokens.UpdateRangeAsync(old);
        }

        var raw = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        await tokens.AddAsync(new EmailToken
        {
            UserId = userId,
            Token = Hash(raw),
            Purpose = purpose,
            ExpiresAt = DateTime.UtcNow.Add(lifetime)
        });
        return raw;
    }

    public Task<EmailToken?> FindAsync(string rawToken, string purpose) =>
        tokens.GetByHashAsync(Hash(rawToken), purpose);

    public Task<EmailToken?> FindValidAsync(string rawToken, string purpose) =>
        tokens.GetValidByHashAsync(Hash(rawToken), purpose);

    public Task MarkUsedAsync(EmailToken token)
    {
        token.UsedAt = DateTime.UtcNow;
        return tokens.UpdateAsync(token);
    }
}
