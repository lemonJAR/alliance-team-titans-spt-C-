using System.Text.Json.Nodes;
using SptApi.Common;
using SptApi.Dtos.Queries;
using SptApi.Mappers;
using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

// Grades hang off an enrollment (one grade record per enrollment). Every change writes a grade_history row.
public class GradeService(
    IGradeRepository grades,
    IEnrollmentRepository enrollments,
    IGradeHistoryService history,
    IGradeAccessPolicy access,
    INotificationService notifications,
    IUnitOfWork unitOfWork,
    IAuditService audit,
    ICurrentUser currentUser) : IGradeService
{
    private const int SearchLimit = 2000;
    private const string Locked = "Grades for a past term are locked. Ask an administrator to make the change.";
    private const string NotFound = "Grade not found.";

    public async Task<ServiceResult> GetMineAsync()
    {
        var student = await access.CurrentStudentAsync();
        if (student is null) return ServiceResult.NotFound("No student profile for this account.");

        var rows = await grades.GetForStudentAsync(student.Id);
        return ServiceResult.Ok(rows.Select(GradeMapper.ToDto));
    }

    // Professors only ever see grades from their own sections, whatever they ask for.
    public async Task<ServiceResult> SearchAsync(int? offeringId, int? studentId, int? termId, int? subjectId, string? period)
    {
        int? teacherId = null;
        if (currentUser.IsProfessor)
        {
            var teacher = await access.CurrentTeacherAsync();
            if (teacher is null) return ServiceResult.NotFound("No teacher profile for this account.");
            teacherId = teacher.Id;
        }

        var filter = new GradeFilter(teacherId, offeringId, studentId, termId, subjectId, (period ?? "").Trim().ToLowerInvariant());
        var rows = await grades.GetFilteredAsync(filter, SearchLimit);
        return ServiceResult.Ok(rows.Select(GradeMapper.ToDto));
    }

    // Body: { student, subject, term, offering?, prelim?, midterm?, finals?, remarks? }   ("student" is students.id)
    public async Task<ServiceResult> CreateAsync(JsonObject body)
    {
        var errors = new Dictionary<string, string[]>();
        var studentId = GradeInputReader.ReadInt(body, "student");
        var subjectId = GradeInputReader.ReadInt(body, "subject");
        var termId = GradeInputReader.ReadInt(body, "term");
        var offeringId = GradeInputReader.ReadInt(body, "offering");
        if (studentId is null) errors["student"] = ["Student is required."];
        if (subjectId is null) errors["subject"] = ["Subject is required."];
        if (termId is null) errors["term"] = ["Term is required."];

        var scores = GradeInputReader.ReadScores(body, errors, onlySentKeys: false);
        var remarks = GradeInputReader.ReadRemarks(body, errors);
        if (errors.Count > 0) return ServiceResult.Invalid(errors);
        if (scores.All(v => v.Value is null)) return ServiceResult.BadRequest("Enter at least one grade.");

        var enrollment = await enrollments.GetForGradingAsync(studentId!.Value, subjectId!.Value, termId!.Value);
        if (enrollment is null || enrollment.RequestStatus != EnrollmentStatus.Enrolled)
            return ServiceResult.BadRequest("That student is not enrolled in this subject for this term.");
        if (offeringId != null && enrollment.OfferingId != offeringId)
            return ServiceResult.BadRequest("That student is enrolled in a different section.");
        if (!await access.CanManageAsync(enrollment))
            return ServiceResult.NotFound("Enrollment not found.");     // don't reveal other teachers' classes
        if (!access.IsTermOpenForEditing(enrollment)) return ServiceResult.BadRequest(Locked);
        if (await grades.ExistsForEnrollmentAsync(enrollment.Id))
            return ServiceResult.Conflict("A grade already exists for this student. Edit it instead.");

        var grade = new Grade
        {
            EnrollmentId = enrollment.Id,
            Prelim = scores["prelim"],
            Midterm = scores["midterm"],
            Finals = scores["finals"],
            Remarks = remarks,
            EnteredBy = currentUser.UserId!.Value
        };

        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await grades.AddAsync(grade);
            await history.RecordAsync(grade.Id, "CREATE", null, GradeInputReader.Snapshot(grade));
        });

        await audit.LogAsync("GRADE_CREATE", "Grade", grade.Id,
            $"{enrollment.Student.StudentIdNo} / {enrollment.Subject.Code}: {GradeInputReader.Snapshot(grade)}");
        await notifications.NotifyAsync(enrollment.Student.UserId, $"A grade was posted for {enrollment.Subject.Code}.");

        var created = await grades.GetByIdWithDetailsAsync(grade.Id);
        return ServiceResult.Created(GradeMapper.ToDto(created!));
    }

    // Only the fields that are sent change; a field sent as null is cleared.
    public async Task<ServiceResult> UpdateAsync(int gradeId, JsonObject body)
    {
        var grade = await grades.GetByIdWithDetailsAsync(gradeId);
        if (grade is null || !await access.CanManageAsync(grade.Enrollment)) return ServiceResult.NotFound(NotFound);
        if (!access.IsTermOpenForEditing(grade.Enrollment)) return ServiceResult.BadRequest(Locked);

        var errors = new Dictionary<string, string[]>();
        var incoming = GradeInputReader.ReadScores(body, errors, onlySentKeys: true);
        var hasRemarks = body.ContainsKey("remarks");
        var remarks = hasRemarks ? GradeInputReader.ReadRemarks(body, errors) : grade.Remarks;
        if (errors.Count > 0) return ServiceResult.Invalid(errors);

        var before = GradeInputReader.Snapshot(grade);
        if (incoming.TryGetValue("prelim", out var prelim)) grade.Prelim = prelim;
        if (incoming.TryGetValue("midterm", out var midterm)) grade.Midterm = midterm;
        if (incoming.TryGetValue("finals", out var finals)) grade.Finals = finals;
        if (hasRemarks) grade.Remarks = remarks;

        if (grade.Prelim is null && grade.Midterm is null && grade.Finals is null)
            return ServiceResult.BadRequest("A grade needs at least one score. Delete the entry to remove it.");

        var after = GradeInputReader.Snapshot(grade);
        if (before == after) return ServiceResult.Ok(GradeMapper.ToDto(grade));      // nothing actually changed

        grade.EnteredBy = currentUser.UserId!.Value;            // last editor
        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await grades.UpdateAsync(grade);
            await history.RecordAsync(grade.Id, "UPDATE", before, after);
        });

        var e = grade.Enrollment;
        await audit.LogAsync("GRADE_UPDATE", "Grade", grade.Id, $"{e.Student.StudentIdNo} / {e.Subject.Code}: {before} -> {after}");
        await notifications.NotifyAsync(e.Student.UserId, $"Your grade for {e.Subject.Code} was updated.");
        return ServiceResult.Ok(GradeMapper.ToDto(grade));
    }

    // The history row stays (grade_history has no foreign key to grades), so the deletion is still traceable.
    public async Task<ServiceResult> DeleteAsync(int gradeId)
    {
        var grade = await grades.GetByIdWithDetailsAsync(gradeId);
        if (grade is null || !await access.CanManageAsync(grade.Enrollment)) return ServiceResult.NotFound(NotFound);
        if (!access.IsTermOpenForEditing(grade.Enrollment)) return ServiceResult.BadRequest(Locked);

        var before = GradeInputReader.Snapshot(grade);
        var label = $"{grade.Enrollment.Student.StudentIdNo} / {grade.Enrollment.Subject.Code}";

        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await history.RecordAsync(grade.Id, "DELETE", before, null);
            await grades.DeleteAsync(grade);
        });

        await audit.LogAsync("GRADE_DELETE", "Grade", gradeId, $"{label}: {before}");
        return ServiceResult.Ok(new { detail = "Grade deleted." });
    }
}
