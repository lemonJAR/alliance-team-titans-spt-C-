using System.Text.Json;
using SptApi.Models;

namespace SptApi.Mappers;

// Grades, grade history and grade-report rows.
public static class GradeMapper
{
    public static object ToDto(Grade g)
    {
        var e = g.Enrollment;
        return new
        {
            id = g.Id,
            enrollment_id = g.EnrollmentId,
            student = e.StudentId,                          // students.id
            student_id_no = e.Student.StudentIdNo,
            student_name = UserMapper.StudentDisplayName(e.Student),
            subject = e.SubjectId,
            subject_id = e.SubjectId,
            subject_code = e.Subject.Code,
            subject_name = e.Subject.Name,
            units = e.Subject.Units,
            year_level = e.Subject.YearLevel,
            semester = e.Subject.Semester,
            term = e.TermId,
            term_label = AcademicMapper.TermLabel(e.Term),
            offering = e.OfferingId,
            offer_code = e.Offering?.OfferCode,
            prelim = g.Prelim,
            midterm = g.Midterm,
            finals = g.Finals,
            remarks = g.Remarks,
            entered_by = g.EnteredBy,
            created_at = g.CreatedAt,
            updated_at = g.UpdatedAt
        };
    }

    // names: user id -> display name of whoever made the change.
    public static object ToHistoryDto(GradeHistory h, IReadOnlyDictionary<int, string> names)
    {
        var oldValues = ParseJson(h.OldValues);
        var newValues = ParseJson(h.NewValues);
        return new
        {
            id = h.Id,
            grade = h.GradeId,
            action = h.Action,
            changed_by = h.ChangedBy,
            changed_by_name = names.GetValueOrDefault(h.ChangedBy),
            old_values = oldValues,
            new_values = newValues,
            current = newValues ?? oldValues,          // what the student page shows as "remarks"
            created_at = h.ChangedAt
        };
    }

    public static object ToReportRow(Enrollment e) => new
    {
        id = e.Grade?.Id,
        enrollment_id = e.Id,
        student = e.StudentId,
        student_id_no = e.Student.StudentIdNo,
        student_name = UserMapper.StudentDisplayName(e.Student),
        subject = e.SubjectId,
        subject_code = e.Subject.Code,
        subject_name = e.Subject.Name,
        term = e.TermId,
        term_label = AcademicMapper.TermLabel(e.Term),
        prelim = e.Grade?.Prelim,
        midterm = e.Grade?.Midterm,
        finals = e.Grade?.Finals,
        remarks = e.Grade?.Remarks
    };

    private static JsonElement? ParseJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<JsonElement>(json); }
        catch (JsonException) { return null; }
    }
}
