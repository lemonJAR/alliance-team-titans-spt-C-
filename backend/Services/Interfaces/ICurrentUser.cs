namespace SptApi.Services;

// Who is calling the API (read from the JWT). Lets services check roles without touching HttpContext.
public interface ICurrentUser
{
    int? UserId { get; }
    string? Email { get; }
    string? Role { get; }
    bool IsAdmin { get; }
    bool IsProfessor { get; }
    bool IsStudent { get; }
}
