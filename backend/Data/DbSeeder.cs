using Microsoft.EntityFrameworkCore;
using SptApi.Models;
using SptApi.Services;

namespace SptApi.Data;

public static class DbSeeder
{
    // Creates the first admin account if no admin exists yet.
    public static async Task SeedAdminAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SptDbContext>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        if (await db.Users.AnyAsync(u => u.Role == Roles.Admin)) return;

        var email = config["Seed:AdminEmail"];
        var password = config["Seed:AdminPassword"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password)) return;

        db.Users.Add(new User
        {
            Email = email.Trim().ToLowerInvariant(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            Role = Roles.Admin,
            FirstName = "System",
            LastName = "Admin",
            IsActive = true,
            EmailVerified = true,
            DateJoined = DateTime.Now
        });
        await db.SaveChangesAsync();
        Console.WriteLine($"[Seed] Admin account created: {email}");
    }
}