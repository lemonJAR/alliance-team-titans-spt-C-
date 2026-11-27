using Microsoft.EntityFrameworkCore;
using SptApi.Data;

namespace SptApi.Repositories;

internal static class DbContextExtensions
{
    // Entities loaded by a repository are already tracked, so SaveChanges writes only the columns that changed.
    // Calling DbSet.Update on them would mark every loaded related row as modified too (and could overwrite
    // values another request just changed, like an offering's slot count). Only attach entities that aren't tracked.
    public static void TrackForUpdate<T>(this SptDbContext db, T entity) where T : class
    {
        if (db.Entry(entity).State == EntityState.Detached) db.Update(entity);
    }

    public static void TrackForUpdate<T>(this SptDbContext db, IEnumerable<T> entities) where T : class
    {
        foreach (var e in entities) db.TrackForUpdate(e);
    }
}
