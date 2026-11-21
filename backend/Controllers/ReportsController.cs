using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SptApi.Dtos;
using SptApi.Services;

namespace SptApi.Controllers;

// Admin grade reports. Filters (all optional): term, program, year_level, student, subject. See ReportFilter.
[ApiController]
[Route("api/system/reports/grades")]
[Authorize(Roles = Roles.Admin)]
public class ReportsController(ReportService reports) : ControllerBase
{
    // GET /api/system/reports/grades/
    [HttpGet]
    public async Task<ActionResult<ReportDto>> GetReport([FromQuery] ReportFilter filter) =>
        Ok(await reports.GetReportAsync(filter));

    // GET /api/system/reports/grades/export/   CSV
    [HttpGet("export")]
    public async Task<IActionResult> ExportCsv([FromQuery] ReportFilter filter) =>
        SendFile(await reports.ExportCsvAsync(filter));

    // GET /api/system/reports/grades/export-xlsx/   Excel
    [HttpGet("export-xlsx")]
    public async Task<IActionResult> ExportExcel([FromQuery] ReportFilter filter) =>
        SendFile(await reports.ExportExcelAsync(filter));

    private FileContentResult SendFile(ReportFile file) => File(file.Content, file.ContentType, file.FileName);
}
