using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SptApi.Common;
using SptApi.Dtos.Queries;
using SptApi.Services;

namespace SptApi.Controllers;

// Admin grade report. Filters (all optional): term (id), program (id), year_level,
// student (ID number like 2025-0001, or database id), subject (code, or database id).
// There is no CSV/Excel export: the page offers PDF and print only, so grades can't be edited after export.
[Route("api/system/reports/grades")]
[Authorize(Roles = Roles.Admin)]
public class ReportsController(IGradeReportService reports) : ApiControllerBase
{
    // GET /api/system/reports/grades
    [HttpGet]
    public async Task<IActionResult> GetReport(
        [FromQuery] int? term, [FromQuery] int? program,
        [FromQuery(Name = "year_level")] int? yearLevel,
        [FromQuery] string? student, [FromQuery] string? subject) =>
        Respond(await reports.GetReportAsync(new ReportFilter(term, program, yearLevel, student, subject)));
}
