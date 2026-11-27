using SptApi.Common;

namespace SptApi.Services;

public class CurrentUser(IHttpContextAccessor http) : ICurrentUser
{
    private System.Security.Claims.ClaimsPrincipal? Principal => http.HttpContext?.User;

    public int? UserId => Principal?.UserId();
    public string? Email => Principal?.UserEmail();
    public string? Role => Principal?.UserRole();

    public bool IsAdmin => Role == Roles.Admin;
    public bool IsProfessor => Role == Roles.Professor;
    public bool IsStudent => Role == Roles.Student;
}
