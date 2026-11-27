using SptApi.Models;

namespace SptApi.Services;

// One-time links for email verification and password reset. Only a hash of each token is stored.
public interface IEmailTokenService
{
    const string Verify = "VERIFY_EMAIL";
    const string Reset = "RESET_PASSWORD";

    Task<string> IssueAsync(int userId, string purpose, TimeSpan lifetime);   // returns the raw token for the link
    Task<EmailToken?> FindAsync(string rawToken, string purpose);             // any state
    Task<EmailToken?> FindValidAsync(string rawToken, string purpose);        // unused and not expired
    Task MarkUsedAsync(EmailToken token);
}
