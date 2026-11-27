using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Repositories;

namespace SptApi.Services;

public class UserAccountService(IUserRepository users, IAuditService audit, ICurrentUser currentUser) : IUserAccountService
{
    // Approve a professor, deactivate / reactivate, or fix a name.
    public async Task<ServiceResult> UpdateAsync(int userId, AdminUpdateUserRequest request)
    {
        var user = await users.GetByIdAsync(userId);
        if (user is null) return ServiceResult.NotFound("User not found.");

        if (request.IsActive == false && user.Id == currentUser.UserId)
            return ServiceResult.BadRequest("You cannot deactivate your own account.");

        var changes = new List<string>();
        if (request.IsActive is bool active && active != (user.IsActive ?? true))
        {
            user.IsActive = active;
            changes.Add(active ? "activated" : "deactivated");
        }
        if (!string.IsNullOrWhiteSpace(request.FirstName)) { user.FirstName = request.FirstName.Trim(); changes.Add("first name"); }
        if (request.MiddleName is not null) { user.MiddleName = Validation.EmptyToNull(request.MiddleName); changes.Add("middle name"); }
        if (!string.IsNullOrWhiteSpace(request.LastName)) { user.LastName = request.LastName.Trim(); changes.Add("last name"); }

        if (changes.Count == 0) return ServiceResult.Ok(new { detail = "No changes." });

        await users.UpdateAsync(user);
        await audit.LogAsync("USER_UPDATE", "User", user.Id, $"Admin updated {user.Email}: {string.Join(", ", changes)}");
        return ServiceResult.Ok(new { detail = "User updated.", id = user.Id, is_active = user.IsActive ?? true });
    }

    // Soft delete: the account is marked inactive so grades and classes attached to it are never lost.
    public async Task<ServiceResult> SoftDeleteAsync(int userId)
    {
        var user = await users.GetByIdAsync(userId);
        if (user is null) return ServiceResult.NotFound("User not found.");
        if (user.Id == currentUser.UserId) return ServiceResult.BadRequest("You cannot delete your own account.");
        if (user.Role == Roles.Admin) return ServiceResult.BadRequest("Admin accounts cannot be deleted here.");
        if (!(user.IsActive ?? true))
            return ServiceResult.Ok(new { detail = "User is already inactive.", id = user.Id, is_active = false });

        await users.SoftDeleteAsync(user);
        await audit.LogAsync("USER_SOFT_DELETE", "User", userId, $"Admin deactivated/soft-deleted {user.Email} ({user.Role})");
        return ServiceResult.Ok(new { detail = "User marked inactive.", id = user.Id, is_active = false });
    }
}
