using SptApi.Common;
using SptApi.Models;
using SptApi.Repositories;
using SptApi.Services;

namespace SptApi.Data;

public static class DbSeeder
{
    // Creates the first admin account if no admin exists yet.
    public static async Task SeedAdminAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<IUserRepository>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        if (await users.AdminExistsAsync()) return;

        var email = config["Seed:AdminEmail"];
        var password = config["Seed:AdminPassword"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password)) return;

        await users.AddAsync(new User
        {
            Email = Validation.NormalizeEmail(email),
            PasswordHash = hasher.Hash(password),
            Role = Roles.Admin,
            FirstName = "System",
            LastName = "Admin",
            IsActive = true,
            EmailVerified = true,
            DateJoined = DateTime.UtcNow
        });
        Console.WriteLine($"[Seed] Admin account created: {email}");
    }
}
