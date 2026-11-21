using Microsoft.AspNetCore.Mvc;
using SptApi.Models;

namespace SptApi.Dtos;

// Request and response shapes for the admin grade report.

// Query-string filters; all optional.
public class ReportFilter
{
    public int? Term { get; set; }          // academic_terms.id
    public int? Program { get; set; }       // programs.id
    [FromQuery(Name = "year_level")]
    public int? YearLevel { get; set; }     // the subject's curriculum year
    public string? Student { get; set; }    // student ID number (2025-0001) or students.id
    public string? Subject { get; set; }    // subject code (IT101) or subjects.id
}

public record ReportSummaryDto(int Total, int Graded, int Passing, int Failing);

// One enrolled student-subject, graded or not.
public record ReportRowDto(
    int? Id,                    // grades.id; null when not graded yet
    int EnrollmentId,
    int Student,
    string StudentIdNo,
    string StudentName,
    int Subject,
    string SubjectCode,
    string SubjectName,
    int Term,
    string TermLabel,
    decimal? Prelim,
    decimal? Midterm,
    decimal? Finals,
    string? Remarks)
{
    // Expects Student -> User, Subject, Term and Grade to be loaded.
    public static ReportRowDto From(Enrollment e) => new(
        e.Grade?.Id, e.Id,
        e.StudentId, e.Student.StudentIdNo, DisplayText.StudentName(e.Student),
        e.SubjectId, e.Subject.Code, e.Subject.Name,
        e.TermId, DisplayText.TermLabel(e.Term),
        e.Grade?.Prelim, e.Grade?.Midterm, e.Grade?.Finals, e.Grade?.Remarks);
}

public record ReportDto(ReportSummaryDto Summary, bool Truncated, IReadOnlyList<ReportRowDto> Results);

public record ReportFile(byte[] Content, string ContentType, string FileName);
