using SptApi.Common;
using SptApi.Dtos.Queries;
using SptApi.Mappers;
using SptApi.Repositories;

namespace SptApi.Services;

public class AuditLogService(
    IAuditLogRepository logs,
    IStudentRepository students,
    ITeacherRepository teachers) : IAuditLogService
{
    private const int Limit = 500;

    // actorType comes from the page as "student" / "teacher"; the log stores the role (STUDENT / PROFESSOR).
    // actorIdNumber is the student ID number or employee ID the admin typed in.
    public async Task<ServiceResult> SearchAsync(string? action, string? actorType, string? actorIdNumber, string? email)
    {
        var role = ToRole(actorType);

        IReadOnlyCollection<int>? actorUserIds = null;
        if (!string.IsNullOrWhiteSpace(actorIdNumber))
        {
            var key = actorIdNumber.Trim();
            var ids = new List<int>();
            if (role is null or Roles.Student) ids.AddRange(await students.GetUserIdsByStudentIdNoAsync(key));
            if (role is null or Roles.Professor) ids.AddRange(await teachers.GetUserIdsByEmployeeIdAsync(key));
            actorUserIds = ids;
        }

        var filter = new AuditLogFilter(
            Action: action?.Trim(),
            ActorType: role,
            Email: string.IsNullOrWhiteSpace(email) ? null : Validation.NormalizeEmail(email),
            ActorUserIds: actorUserIds);

        var rows = await logs.SearchAsync(filter, Limit);
        return ServiceResult.Ok(rows.Select(ActivityMapper.ToDto));
    }

    private static string? ToRole(string? actorType) => (actorType ?? "").Trim().ToUpperInvariant() switch
    {
        "" => null,
        "TEACHER" or "PROFESSOR" => Roles.Professor,
        "STUDENT" => Roles.Student,
        "ADMIN" => Roles.Admin,
        var other => other
    };
}
