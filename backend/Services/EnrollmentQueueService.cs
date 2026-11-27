using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Mappers;
using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

public class EnrollmentQueueService(
    IEnrollmentRepository enrollments,
    INotificationService notifications,
    IAuditService audit) : IEnrollmentQueueService
{
    // Requests in the active term with the given status (PENDING by default).
    public async Task<ServiceResult> GetQueueAsync(string? status)
    {
        var wanted = (status ?? EnrollmentStatus.Pending).Trim().ToUpperInvariant();
        if (!EnrollmentStatus.IsKnown(wanted))
            return ServiceResult.BadRequest("status must be PENDING, APPROVED, REJECTED or ENROLLED.");

        var rows = await enrollments.GetQueueAsync(wanted);
        return ServiceResult.Ok(rows.Select(EnrollmentMapper.ToQueueItem));
    }

    // Only PENDING requests change; anything else is skipped and counted.
    public async Task<ServiceResult> DecideAsync(QueueActionRequest request)
    {
        var action = (request.Action ?? "").Trim().ToUpperInvariant();
        if (action is not (EnrollmentStatus.Approved or EnrollmentStatus.Rejected))
            return ServiceResult.BadRequest("action must be APPROVED or REJECTED.");

        var ids = (request.EnrollmentIds ?? []).Distinct().ToList();
        if (ids.Count == 0) return ServiceResult.BadRequest("Select at least one request.");

        var pending = (await enrollments.GetByIdsAsync(ids))
            .Where(e => e.RequestStatus == EnrollmentStatus.Pending).ToList();
        if (pending.Count > 0)
        {
            foreach (var e in pending) e.RequestStatus = action;
            await enrollments.UpdateRangeAsync(pending);

            await notifications.NotifyManyAsync(pending
                .Where(e => e.Student.UserId != null)
                .Select(e => (e.Student.UserId!.Value, action == EnrollmentStatus.Approved
                    ? $"{e.Subject.Code} was approved. You can now pick a schedule."
                    : $"{e.Subject.Code} was not approved. You may request it again.")));
        }

        await audit.LogAsync(action == EnrollmentStatus.Approved ? "ENROLLMENT_APPROVE" : "ENROLLMENT_REJECT", "Enrollment", null,
            $"{pending.Count} request(s): {string.Join(", ", pending.Select(e => e.Id))}");

        return ServiceResult.Ok(new { updated = pending.Count, skipped = ids.Count - pending.Count });
    }
}
