using SptApi.Models;

namespace SptApi.Services;

// Composes and sends the account emails. Never throws: the account change is already saved.
public interface IAccountEmailService
{
    Task SendVerificationAsync(User user);
    Task SendPasswordResetAsync(User user);
    Task SendCredentialsAsync(User user, string temporaryPassword);
}
