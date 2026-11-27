using SptApi.Common;
using SptApi.Dtos.Queries;
using SptApi.Mappers;
using SptApi.Repositories;

namespace SptApi.Services;

// Covers every ENROLLED student-subject, graded or not, which is why the summary shows "total" and "graded".
// Exports are produced on the page as PDF / print only, so nobody receives an editable copy of the grades.
public class GradeReportService(IGradeReportRepository reports) : IGradeReportService
{
    private const int RowLimit = 5000;

    public async Task<ServiceResult> GetReportAsync(ReportFilter filter)
    {
        var summary = await reports.GetSummaryAsync(filter, GradeRules.Passing);
        var rows = await reports.GetRowsAsync(filter, RowLimit);

        return ServiceResult.Ok(new
        {
            summary = new { total = summary.Total, graded = summary.Graded, passing = summary.Passing, failing = summary.Failing },
            truncated = summary.Total > RowLimit,
            results = rows.Select(GradeMapper.ToReportRow)
        });
    }
}
