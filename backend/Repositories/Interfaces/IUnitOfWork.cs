namespace SptApi.Repositories;

// Runs several repository calls as one database transaction (all saved, or none).
public interface IUnitOfWork
{
    // Commits when the work finishes; rolls back if it throws.
    Task ExecuteInTransactionAsync(Func<Task> work);

    // Commits only when the work returns true; rolls back when it returns false or throws.
    Task<bool> ExecuteInTransactionAsync(Func<Task<bool>> work);
}
