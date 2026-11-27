using SptApi.Models;

namespace SptApi.Services;

public class AccountEmailService(IEmailSender email, IEmailTokenService tokens, IConfiguration config) : IAccountEmailService
{
    private string FrontendUrl => (config["App:FrontendUrl"] ?? "http://localhost:5173").TrimEnd('/');

    public Task SendVerificationAsync(User user) => SafeSend("verification email", async () =>
    {
        var raw = await tokens.IssueAsync(user.Id, IEmailTokenService.Verify, TimeSpan.FromHours(24));
        await email.SendAsync(user.Email, "Verify your email - Student Performance Tracker",
            $"Hi {user.FirstName},\n\nPlease verify your email by opening this link (valid for 24 hours):\n" +
            $"{FrontendUrl}/verify-email/{raw}\n\nIf you didn't create this account, you can ignore this email.");
    });

    public Task SendPasswordResetAsync(User user) => SafeSend("password reset email", async () =>
    {
        var raw = await tokens.IssueAsync(user.Id, IEmailTokenService.Reset, TimeSpan.FromHours(1));
        await email.SendAsync(user.Email, "Reset your password - Student Performance Tracker",
            $"Hi {user.FirstName},\n\nOpen this link to choose a new password (valid for 1 hour):\n" +
            $"{FrontendUrl}/reset-password/{raw}\n\nIf you didn't ask for this, you can ignore this email.");
    });

    public Task SendCredentialsAsync(User user, string temporaryPassword) => SafeSend("credentials email", () =>
        email.SendAsync(user.Email, "Your account - Student Performance Tracker",
            $"Hi {user.FirstName},\n\nAn administrator created an account for you.\n\n" +
            $"Email: {user.Email}\nTemporary password: {temporaryPassword}\n\n" +
            $"Sign in at {FrontendUrl}/login and change your password right away."));

    private static async Task SafeSend(string what, Func<Task> send)
    {
        try { await send(); }
        catch (Exception ex) { Console.WriteLine($"[Email] Could not send {what}: {ex.Message}"); }
    }
}
