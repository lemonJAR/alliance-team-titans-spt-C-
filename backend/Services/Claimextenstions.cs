using System.Security.Claims;

namespace SptApi.Services;

public static class ClaimsExtensions
{
    // Reads the logged-in user's id from the JWT ("sub" claim)
    public static int? UserId(this ClaimsPrincipal p) =>
        int.TryParse(p.FindFirst("sub")?.Value, out var id) ? id : null;

    public static string? UserEmail(this ClaimsPrincipal p) => p.FindFirst("email")?.Value;

    public static string? UserRole(this ClaimsPrincipal p) => p.FindFirst("role")?.Value;
}