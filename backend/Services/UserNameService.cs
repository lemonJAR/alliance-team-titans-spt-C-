using SptApi.Dtos.Requests;
using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

public class UserNameService(IUserRepository users, IAuditService audit) : IUserNameService
{
    private const int MaxLength = 80;

    public async Task<Dictionary<string, string[]>?> UpdateOwnNameAsync(User user, UpdateNameRequest request)
    {
        var errors = Validate(request);
        if (errors.Count > 0) return errors;

        // Only fields that were sent change.
        if (request.FirstName is not null) user.FirstName = request.FirstName.Trim();
        if (request.LastName is not null) user.LastName = request.LastName.Trim();
        if (request.MiddleName is not null)
            user.MiddleName = string.IsNullOrWhiteSpace(request.MiddleName) ? null : request.MiddleName.Trim();

        await users.UpdateAsync(user);
        await audit.LogAsync("PROFILE_UPDATE", "User", user.Id, "Updated own name");
        return null;
    }

    private static Dictionary<string, string[]> Validate(UpdateNameRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        CheckRequired(errors, "first_name", "First name", request.FirstName);
        CheckRequired(errors, "last_name", "Last name", request.LastName);
        if (request.MiddleName is { Length: > MaxLength })
            errors["middle_name"] = [$"Middle name must be {MaxLength} characters or fewer."];
        return errors;
    }

    // A name that is sent must not be blank or too long. A name that is not sent is left alone.
    private static void CheckRequired(Dictionary<string, string[]> errors, string field, string label, string? value)
    {
        if (value is null) return;
        var v = value.Trim();
        if (v == "") errors[field] = [$"{label} cannot be empty."];
        else if (v.Length > MaxLength) errors[field] = [$"{label} must be {MaxLength} characters or fewer."];
    }
}
