using SptApi.Data;

namespace SptApi.Repositories;

public class UnitOfWork(SptDbContext db) : IUnitOfWork
{
    public async Task ExecuteInTransactionAsync(Func<Task> work)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        await work();
        await tx.CommitAsync();
    }

    public async Task<bool> ExecuteInTransactionAsync(Func<Task<bool>> work)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        var commit = await work();
        if (commit) await tx.CommitAsync();
        else await tx.RollbackAsync();
        return commit;
    }
}
