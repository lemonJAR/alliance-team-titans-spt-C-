using Microsoft.EntityFrameworkCore;
using SptApi.Common;
using SptApi.Data;
using SptApi.Models;

namespace SptApi.Repositories;

public class UserRepository(SptDbContext db) : IUserRepository
{
    public Task<User?> GetByIdAsync(int id) =>
        db.Users.FirstOrDefaultAsync(u => u.Id == id);

    public Task<User?> GetByIdWithProfilesAsync(int id) =>
        db.Users.Include(u => u.Student).Include(u => u.Teacher).FirstOrDefaultAsync(u => u.Id == id);

    public Task<User?> GetByEmailAsync(string email) =>
        db.Users.FirstOrDefaultAsync(u => u.Email == email);

    public Task<User?> GetByEmailWithProfilesAsync(string email) =>
        db.Users.Include(u => u.Student).Include(u => u.Teacher).FirstOrDefaultAsync(u => u.Email == email);

    public Task<bool> EmailExistsAsync(string email) =>
        db.Users.AnyAsync(u => u.Email == email);

    public Task<bool> AdminExistsAsync() =>
        db.Users.AnyAsync(u => u.Role == Roles.Admin);

    public async Task<bool> IsActiveAsync(int id)
    {
        var active = await db.Users.Where(u => u.Id == id)
            .Select(u => (bool?)(u.IsActive ?? true)).FirstOrDefaultAsync();
        return active == true;
    }

    public Task<Dictionary<int, string>> GetDisplayNamesAsync(IEnumerable<int> ids)
    {
        var list = ids.Distinct().ToList();
        return db.Users.Where(u => list.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}");
    }

    public async Task AddAsync(User user)
    {
        db.Users.Add(user);
        await db.SaveChangesAsync();
    }

    public async Task UpdateAsync(User user)
    {
        db.TrackForUpdate(user);
        await db.SaveChangesAsync();
    }

    public async Task SoftDeleteAsync(User user)
    {
        user.IsActive = false;
        db.TrackForUpdate(user);
        await db.SaveChangesAsync();
    }
}
