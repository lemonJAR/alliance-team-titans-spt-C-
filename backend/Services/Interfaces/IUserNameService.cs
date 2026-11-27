using SptApi.Dtos.Requests;
using SptApi.Models;

namespace SptApi.Services;

// The one place that validates and saves a person's name, used by every "edit my name" endpoint.
public interface IUserNameService
{
    // Returns field errors, or null when the name was saved.
    Task<Dictionary<string, string[]>?> UpdateOwnNameAsync(User user, UpdateNameRequest request);
}
