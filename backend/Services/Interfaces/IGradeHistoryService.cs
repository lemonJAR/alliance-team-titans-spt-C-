using SptApi.Common;

namespace SptApi.Services;

// Who changed a grade and when.
public interface IGradeHistoryService
{
    Task<ServiceResult> GetForGradeAsync(int gradeId);
    Task<ServiceResult> GetTimelineAsync(int? studentId);
    Task RecordAsync(int gradeId, string action, string? oldValues, string? newValues);
}
