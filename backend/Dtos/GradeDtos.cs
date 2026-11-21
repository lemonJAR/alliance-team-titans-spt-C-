using System.Text.Json;
using SptApi.Models;

namespace SptApi.Dtos;

// Response shapes for grade endpoints. Property names are serialized as snake_case (see Program.cs).

public record GradeDto(
    int Id,
    int EnrollmentId,
    int Student,
    string StudentIdNo,
    string StudentName,
    int Subject,
    int SubjectId,
    string SubjectCode,
    string SubjectName,
    int Units,
    sbyte YearLevel,
    sbyte Semester,
    int Term,
    string TermLabel,
    int? Offering,
    string? OfferCode,
    decimal? Prelim,
    decimal? Midterm,
    decimal? Finals,
    string? Remarks,
    int EnteredBy,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    // Expects Enrollment -> Student -> User, Subject, Term and Offering to be loaded.
    public static GradeDto From(Grade g)
    {
        var e = g.Enrollment;
        return new GradeDto(
            g.Id, g.EnrollmentId,
            e.StudentId, e.Student.StudentIdNo, DisplayText.StudentName(e.Student),
            e.SubjectId, e.SubjectId, e.Subject.Code, e.Subject.Name, e.Subject.Units,
            e.Subject.YearLevel, e.Subject.Semester,
            e.TermId, DisplayText.TermLabel(e.Term),
            e.OfferingId, e.Offering?.OfferCode,
            g.Prelim, g.Midterm, g.Finals, g.Remarks,
            g.EnteredBy, g.CreatedAt, g.UpdatedAt);
    }
}

public record GradeHistoryDto(
    int Id,
    int Grade,
    string Action,              // CREATE | UPDATE | DELETE
    int ChangedBy,
    string? ChangedByName,
    JsonElement? OldValues,
    JsonElement? NewValues,
    JsonElement? Current,       // NewValues, or OldValues for a DELETE
    DateTime CreatedAt);

public static class DisplayText
{
    public static string StudentName(Student s) =>
        s.User is null ? s.StudentIdNo : $"{s.User.LastName}, {s.User.FirstName}";

    public static string TermLabel(AcademicTerm t) => $"{t.SchoolYear} - Sem {t.Semester}";
}
