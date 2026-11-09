using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;
using SptApi.Services;

namespace SptApi.Controllers;

// Admin grade reports. The report covers every ENROLLED student-subject, graded or not, which is why the
// summary shows both "total" and "graded".
//
// Filters (all optional): term (id), program (id), year_level (the subject's year in the curriculum),
// student (student ID number like 2024-00001, or the database id), subject (subject code, or the database id).
[ApiController]
[Route("api/system/reports/grades")]
[Authorize(Roles = Roles.Admin)]
public class ReportsController(SptDbContext db, AuditService audit) : ControllerBase
{
    private const int JsonRowLimit = 5000;
    private const int ExportRowLimit = 20000;

    // GET /api/system/reports/grades/
    [HttpGet]
    public async Task<IActionResult> GetReport(
        [FromQuery] int? term, [FromQuery] int? program,
        [FromQuery(Name = "year_level")] int? yearLevel,
        [FromQuery] string? student, [FromQuery] string? subject)
    {
        var q = Filtered(term, program, yearLevel, student, subject);

        // Counted in the database so the numbers are right even when the table below is capped.
        var total = await q.CountAsync();
        var graded = await q.CountAsync(e => e.Grade != null && e.Grade.Finals != null);
        var passing = await q.CountAsync(e => e.Grade != null && e.Grade.Finals != null && e.Grade.Finals <= GradeRules.Passing);
        var failing = graded - passing;

        var rows = await Ordered(q).Take(JsonRowLimit).ToListAsync();

        return Ok(new
        {
            summary = new { total, graded, passing, failing },
            truncated = total > JsonRowLimit,
            results = rows.Select(ToRow)
        });
    }

    // GET /api/system/reports/grades/export/   CSV
    [HttpGet("export")]
    public async Task<IActionResult> ExportCsv(
        [FromQuery] int? term, [FromQuery] int? program,
        [FromQuery(Name = "year_level")] int? yearLevel,
        [FromQuery] string? student, [FromQuery] string? subject)
    {
        var rows = await Ordered(Filtered(term, program, yearLevel, student, subject))
            .Take(ExportRowLimit).ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Student ID,Student,Code,Subject,Term,Prelim,Midterm,Finals,Remarks");
        foreach (var e in rows)
        {
            sb.AppendLine(string.Join(",", new[]
            {
                CsvText.Cell(e.Student.StudentIdNo), CsvText.Cell(StudentName(e)),
                CsvText.Cell(e.Subject.Code), CsvText.Cell(e.Subject.Name), CsvText.Cell(TermLabel(e)),
                CsvText.Cell(Fmt(e.Grade?.Prelim)), CsvText.Cell(Fmt(e.Grade?.Midterm)),
                CsvText.Cell(Fmt(e.Grade?.Finals)), CsvText.Cell(e.Grade?.Remarks)
            }));
        }

        await audit.LogAsync("REPORT_EXPORT", "Report", null, $"Grade report CSV, {rows.Count} row(s)");

        // UTF-8 with a BOM so Excel reads accented names correctly.
        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return File(bytes, "text/csv", "grade_report.csv");
    }

    // GET /api/system/reports/grades/export-xlsx/   Excel
    [HttpGet("export-xlsx")]
    public async Task<IActionResult> ExportExcel(
        [FromQuery] int? term, [FromQuery] int? program,
        [FromQuery(Name = "year_level")] int? yearLevel,
        [FromQuery] string? student, [FromQuery] string? subject)
    {
        var rows = await Ordered(Filtered(term, program, yearLevel, student, subject))
            .Take(ExportRowLimit).ToListAsync();

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Grades");

        string[] headers = ["Student ID", "Student", "Code", "Subject", "Term", "Prelim", "Midterm", "Finals", "Remarks"];
        for (var c = 0; c < headers.Length; c++)
        {
            var cell = ws.Cell(1, c + 1);
            cell.Value = headers[c];
            cell.Style.Font.Bold = true;
        }

        var r = 2;
        foreach (var e in rows)
        {
            // Text goes through Defuse so a user-typed "=..." can never become a formula.
            ws.Cell(r, 1).Value = CsvText.Defuse(e.Student.StudentIdNo);
            ws.Cell(r, 2).Value = CsvText.Defuse(StudentName(e));
            ws.Cell(r, 3).Value = CsvText.Defuse(e.Subject.Code);
            ws.Cell(r, 4).Value = CsvText.Defuse(e.Subject.Name);
            ws.Cell(r, 5).Value = CsvText.Defuse(TermLabel(e));
            SetGrade(ws.Cell(r, 6), e.Grade?.Prelim);
            SetGrade(ws.Cell(r, 7), e.Grade?.Midterm);
            SetGrade(ws.Cell(r, 8), e.Grade?.Finals);
            ws.Cell(r, 9).Value = CsvText.Defuse(e.Grade?.Remarks);
            r++;
        }

        ws.SheetView.FreezeRows(1);
        ws.Columns().AdjustToContents();

        await audit.LogAsync("REPORT_EXPORT", "Report", null, $"Grade report Excel, {rows.Count} row(s)");

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return File(stream.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "grade_report.xlsx");
    }

    // ═════════════════════════ helpers ═════════════════════════

    private IQueryable<Enrollment> Filtered(int? term, int? program, int? yearLevel, string? student, string? subject)
    {
        var q = db.Enrollments
            .Include(e => e.Student).ThenInclude(s => s.User)
            .Include(e => e.Subject)
            .Include(e => e.Term)
            .Include(e => e.Grade)
            .Where(e => e.RequestStatus == "ENROLLED");

        if (term != null) q = q.Where(e => e.TermId == term);
        if (program != null) q = q.Where(e => e.Subject.ProgramId == program);
        if (yearLevel != null) q = q.Where(e => e.Subject.YearLevel == yearLevel);

        if (!string.IsNullOrWhiteSpace(student))
        {
            var key = student.Trim();
            var pk = int.TryParse(key, out var n) ? n : -1;
            q = q.Where(e => e.Student.StudentIdNo == key || e.StudentId == pk);
        }
        if (!string.IsNullOrWhiteSpace(subject))
        {
            var key = subject.Trim().ToUpperInvariant();
            var pk = int.TryParse(key, out var n) ? n : -1;
            q = q.Where(e => e.Subject.Code == key || e.SubjectId == pk);
        }
        return q;
    }

    private static IOrderedQueryable<Enrollment> Ordered(IQueryable<Enrollment> q) => q
        .OrderByDescending(e => e.Term.SchoolYear).ThenByDescending(e => e.Term.Semester)
        .ThenBy(e => e.Student.StudentIdNo).ThenBy(e => e.Subject.Code);

    private static object ToRow(Enrollment e) => new
    {
        id = e.Grade?.Id,
        enrollment_id = e.Id,
        student = e.StudentId,
        student_id_no = e.Student.StudentIdNo,
        student_name = StudentName(e),
        subject = e.SubjectId,
        subject_code = e.Subject.Code,
        subject_name = e.Subject.Name,
        term = e.TermId,
        term_label = TermLabel(e),
        prelim = e.Grade?.Prelim,
        midterm = e.Grade?.Midterm,
        finals = e.Grade?.Finals,
        remarks = e.Grade?.Remarks
    };

    private static string StudentName(Enrollment e) =>
        e.Student.User is null ? e.Student.StudentIdNo : $"{e.Student.User.LastName}, {e.Student.User.FirstName}";

    private static string TermLabel(Enrollment e) => $"{e.Term.SchoolYear} - Sem {e.Term.Semester}";

    private static string Fmt(decimal? v) => v?.ToString("0.00", CultureInfo.InvariantCulture) ?? "";

    // Grades go in as real numbers so Excel can average and sort them; blank when not graded yet.
    private static void SetGrade(IXLCell cell, decimal? grade)
    {
        if (grade is null) return;
        cell.Value = (double)grade.Value;
        cell.Style.NumberFormat.Format = "0.00";
    }
}