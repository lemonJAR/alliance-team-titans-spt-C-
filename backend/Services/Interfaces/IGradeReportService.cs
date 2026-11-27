using SptApi.Common;
using SptApi.Dtos.Queries;

namespace SptApi.Services;

// Admin grade report.
public interface IGradeReportService
{
    Task<ServiceResult> GetReportAsync(ReportFilter filter);
}
