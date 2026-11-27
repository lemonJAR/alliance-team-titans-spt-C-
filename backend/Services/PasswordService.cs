using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Repositories;

namespace SptApi.Services;

public class PasswordService(
    IUserRepository users,
    IPasswordHasher hasher,
    IEmailTokenService emailTokens,
    IAccountEmailService accountEmails,
    IAuditService audit,
    ICurrentUser currentUser) : IPasswordService
{
    public async Task<ServiceResult> RequestResetAsync(EmailRequest request)
    {
        var user = await users.GetByEmailAsync(Validation.NormalizeEmail(request.Email));
        if (user != null && user.IsActive != false)
        {
            await accountEmails.SendPasswordResetAsync(user);
            await audit.LogAsync("PASSWORD_RESET_REQUESTED", "User", user.Id, "Password reset link requested",
                actorId: user.Id, email: user.Email, role: user.Role);
        }

        // Same answer either way so this can't be used to discover registered emails.
        return ServiceResult.Ok(new { message = "If the email exists, a reset link has been sent." });
    }

    public async Task<ServiceResult> ResetAsync(ResetPasswordRequest request)
    {
        var pwError = PasswordRules.Validate(request.NewPassword);
        if (pwError != null) return ServiceResult.BadRequestError(pwError);

        var rec = await emailTokens.FindValidAsync(request.Token ?? "", IEmailTokenService.Reset);
        if (rec is null) return ServiceResult.BadRequestError("This reset link is invalid or has expired.");

        rec.User.PasswordHash = hasher.Hash(request.NewPassword!);
        await users.UpdateAsync(rec.User);
        await emailTokens.MarkUsedAsync(rec);

        await audit.LogAsync("PASSWORD_RESET", "User", rec.User.Id, "Password reset using email link",
            actorId: rec.User.Id, email: rec.User.Email, role: rec.User.Role);
        return ServiceResult.Ok(new { message = "Password updated. You can now sign in." });
    }

    public async Task<ServiceResult> ChangeAsync(ChangePasswordRequest request)
    {
        var user = currentUser.UserId is int id ? await users.GetByIdAsync(id) : null;
        if (user is null) return ServiceResult.Unauthorized();

        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrEmpty(request.CurrentPassword) || !hasher.Verify(request.CurrentPassword, user.PasswordHash))
            errors["current_password"] = ["Current password is incorrect."];

        var pwError = PasswordRules.Validate(request.NewPassword);
        if (pwError != null) errors["new_password"] = [pwError];
        else if (request.NewPassword == request.CurrentPassword)
            errors["new_password"] = ["New password must be different from the current one."];
        if (errors.Count > 0) return ServiceResult.Invalid(errors);

        user.PasswordHash = hasher.Hash(request.NewPassword!);
        await users.UpdateAsync(user);
        await audit.LogAsync("PASSWORD_CHANGE", "User", user.Id, "Password changed by user");
        return ServiceResult.Ok(new { message = "Password changed." });
    }
}
