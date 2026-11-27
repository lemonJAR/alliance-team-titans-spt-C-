using SptApi.Dtos.Queries;
using SptApi.Models;

namespace SptApi.Repositories;

// Read-only queries behind the admin grade report (every ENROLLED student-subject, graded or not).
public interface IGradeReportRepository
{
    Task<ReportSummary> GetSummaryAsync(ReportFilter filter, decimal passingGrade);
    Task<List<Enrollment>> GetRowsAsync(ReportFilter filter, int limit);
}
