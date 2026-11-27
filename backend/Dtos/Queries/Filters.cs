namespace SptApi.Dtos.Queries;

// Search criteria passed from a service to a repository. All fields are optional.

public record OfferingFilter(int? TermId, int? ProgramId, int? YearLevel, int? Semester);

// TeacherId limits results to one professor's sections (set by the service for professors).
public record GradeFilter(int? TeacherId, int? OfferingId, int? StudentId, int? TermId, int? SubjectId, string? Period);

// Student/Subject accept either the human code (2025-0001, IT101) or the database id.
public record ReportFilter(int? TermId, int? ProgramId, int? YearLevel, string? Student, string? Subject);

// ActorUserIds narrows the log to specific accounts (resolved from a student/employee ID number).
public record AuditLogFilter(string? Action, string? ActorType, string? Email, IReadOnlyCollection<int>? ActorUserIds);

public record ReportSummary(int Total, int Graded, int Passing, int Failing);
