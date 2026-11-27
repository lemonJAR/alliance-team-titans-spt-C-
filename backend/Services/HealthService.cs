using SptApi.Common;
using SptApi.Repositories;

namespace SptApi.Services;

// Confirms the API is up and can reach the database.
public class HealthService(IStudentRepository students) : IHealthService
{
    public async Task<ServiceResult> CheckAsync() =>
        ServiceResult.Ok(new { status = "ok", students = await students.CountAsync() });
}
