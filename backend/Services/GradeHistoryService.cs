using SptApi.Common;
using SptApi.Mappers;
using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

public class GradeHistoryService(
    IGradeHistoryRepository history,
    IGradeRepository grades,
    IUserRepository users,
    IGradeAccessPolicy access,
    ICurrentUser currentUser) : IGradeHistoryService
{
    private const int TimelineLimit = 200;

    public async Task<ServiceResult> GetForGradeAsync(int gradeId)
    {
        var grade = await grades.GetByIdWithDetailsAsync(gradeId);

        // A deleted grade has no owner to check, so only admins may still read its trail.
        var allowed = grade is null ? currentUser.IsAdmin : await access.CanReadAsync(grade);
        if (!allowed) return ServiceResult.NotFound("Grade not found.");

        return ServiceResult.Ok(await ToDtosAsync(await history.GetForGradeAsync(gradeId)));
    }

    // Student: own history. Professor: their own sections. Admin: everything (optionally one student).
    public async Task<ServiceResult> GetTimelineAsync(int? studentId)
    {
        int? teacherId = null;
        if (currentUser.IsProfessor)
        {
            var teacher = await access.CurrentTeacherAsync();
            if (teacher is null) return ServiceResult.NotFound("No teacher profile for this account.");
            teacherId = teacher.Id;
        }
        else if (!currentUser.IsAdmin)
        {
            var me = await access.CurrentStudentAsync();
            if (me is null) return ServiceResult.NotFound("No student profile for this account.");
            studentId = me.Id;               // a student can only ever see their own
        }

        return ServiceResult.Ok(await ToDtosAsync(await history.GetTimelineAsync(studentId, teacherId, TimelineLimit)));
    }

    public Task RecordAsync(int gradeId, string action, string? oldValues, string? newValues) =>
        history.AddAsync(new GradeHistory
        {
            GradeId = gradeId,
            ChangedBy = currentUser.UserId!.Value,
            Action = action,
            OldValues = oldValues,
            NewValues = newValues,
            ChangedAt = DateTime.UtcNow
        });

    private async Task<List<object>> ToDtosAsync(List<GradeHistory> rows)
    {
        var names = await users.GetDisplayNamesAsync(rows.Select(h => h.ChangedBy));
        return rows.Select(h => GradeMapper.ToHistoryDto(h, names)).ToList();
    }
}
