using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Mappers;
using SptApi.Repositories;

namespace SptApi.Services;

public class AuthService(
    IUserRepository users,
    IPasswordHasher hasher,
    ITokenService tokens,
    IUserNameService names,
    IAuditService audit,
    ICurrentUser currentUser) : IAuthService
{
    public async Task<ServiceResult> LoginAsync(LoginRequest request)
    {
        var email = Validation.NormalizeEmail(request.Email);
        var user = await users.GetByEmailWithProfilesAsync(email);

        // Same message for "no such user" and "wrong password" so nobody can tell which emails exist.
        // 400 (not 401) because the frontend logs the user out on any 401.
        if (user is null || !hasher.Verify(request.Password ?? "", user.PasswordHash))
        {
            await audit.LogAsync("LOGIN_FAILED", "User", user?.Id, $"Failed login for {email}",
                actorId: user?.Id, email: email, role: user?.Role);
            return ServiceResult.BadRequest("Invalid email or password.");
        }

        if (user.IsActive == false)
            return ServiceResult.Forbidden("This account is not active. It may be waiting for administrator approval or has been deactivated. Contact the administrator.");

        if (!user.EmailVerified)
            return ServiceResult.Forbidden("Please verify your email before logging in.");

        await audit.LogAsync("LOGIN", "User", user.Id, "User logged in",
            actorId: user.Id, email: user.Email, role: user.Role);

        return ServiceResult.Ok(new { token = tokens.CreateToken(user), user = UserMapper.ToSessionDto(user) });
    }

    // JWTs are stateless, so the real logout is the frontend deleting the token. This only records it.
    public async Task<ServiceResult> LogoutAsync()
    {
        await audit.LogAsync("LOGOUT", "User", currentUser.UserId, "User logged out");
        return ServiceResult.Ok(new { detail = "Logged out." });
    }

    public async Task<ServiceResult> GetMeAsync()
    {
        var user = currentUser.UserId is int id ? await users.GetByIdWithProfilesAsync(id) : null;
        return user is null ? ServiceResult.Unauthorized() : ServiceResult.Ok(UserMapper.ToSessionDto(user));
    }

    public async Task<ServiceResult> UpdateMeAsync(UpdateNameRequest request)
    {
        var user = currentUser.UserId is int id ? await users.GetByIdWithProfilesAsync(id) : null;
        if (user is null) return ServiceResult.Unauthorized();

        var errors = await names.UpdateOwnNameAsync(user, request);
        return errors is null ? ServiceResult.Ok(UserMapper.ToSessionDto(user)) : ServiceResult.Invalid(errors);
    }
}
