using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Dtos;
using SptApi.Models;

namespace SptApi.Services;

// Admin grade reports: filtering, summary counts and CSV / Excel exports.
// The report covers every ENROLLED student-subject, graded or not, so "total" and "graded" can differ.
public class ReportService(SptDbContext db, AuditService audit)
{
    public const int JsonRowLimit = 5000;
    public const int ExportRowLimit = 20000;

    private static readonly string[] Headers =
        ["Student ID", "Student", "Code", "Subject", "Term", "Prelim", "Midterm", "Finals", "Remarks"];

    public async Task<ReportDto> GetReportAsync(ReportFilter filter)
    {
        var q = Filtered(filter);

        // Counted in the database so the numbers stay right when the rows below are capped.
        var total = await q.CountAsync();
        var graded = await q.CountAsync(e => e.Grade != null && e.Grade.Finals != null);
        var passing = await q.CountAsync(e => e.Grade != null && e.Grade.Finals != null && e.Grade.Finals <= GradeRules.Passing);
        var failing = graded - passing;

        var rows = await Ordered(q).Take(JsonRowLimit).ToListAsync();

        return new ReportDto(
            new ReportSummaryDto(total, graded, passing, failing),
            Truncated: total > JsonRowLimit,
            Results: rows.Select(ReportRowDto.From).ToList());
    }

    public async Task<ReportFile> ExportCsvAsync(ReportFilter filter)
    {
        var rows = await ExportRowsAsync(filter);

        var sb = new StringBuilder();
        sb.AppendLine(string.Join(",", Headers));
        foreach (var r in rows)
        {
            sb.AppendLine(string.Join(",", new[]
            {
                CsvText.Cell(r.StudentIdNo), CsvText.Cell(r.StudentName),
                CsvText.Cell(r.SubjectCode), CsvText.Cell(r.SubjectName), CsvText.Cell(r.TermLabel),
                CsvText.Cell(Fmt(r.Prelim)), CsvText.Cell(Fmt(r.Midterm)),
                CsvText.Cell(Fmt(r.Finals)), CsvText.Cell(r.Remarks)
            }));
        }

        await audit.LogAsync("REPORT_EXPORT", "Report", null, $"Grade report CSV, {rows.Count} row(s)");

        // UTF-8 with a BOM so Excel reads accented names correctly.
        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return new ReportFile(bytes, "text/csv", "grade_report.csv");
    }

    public async Task<ReportFile> ExportExcelAsync(ReportFilter filter)
    {
        var rows = await ExportRowsAsync(filter);

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Grades");

        for (var c = 0; c < Headers.Length; c++)
        {
            var cell = ws.Cell(1, c + 1);
            cell.Value = Headers[c];
            cell.Style.Font.Bold = true;
        }

        var line = 2;
        foreach (var r in rows)
        {
            // Text goes through Defuse so a user-typed "=..." can never become a formula.
            ws.Cell(line, 1).Value = CsvText.Defuse(r.StudentIdNo);
            ws.Cell(line, 2).Value = CsvText.Defuse(r.StudentName);
            ws.Cell(line, 3).Value = CsvText.Defuse(r.SubjectCode);
            ws.Cell(line, 4).Value = CsvText.Defuse(r.SubjectName);
            ws.Cell(line, 5).Value = CsvText.Defuse(r.TermLabel);
            SetGrade(ws.Cell(line, 6), r.Prelim);
            SetGrade(ws.Cell(line, 7), r.Midterm);
            SetGrade(ws.Cell(line, 8), r.Finals);
            ws.Cell(line, 9).Value = CsvText.Defuse(r.Remarks);
            line++;
        }

        ws.SheetView.FreezeRows(1);
        ws.Columns().AdjustToContents();

        await audit.LogAsync("REPORT_EXPORT", "Report", null, $"Grade report Excel, {rows.Count} row(s)");

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return new ReportFile(stream.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "grade_report.xlsx");
    }

    // ───── helpers ─────

    private IQueryable<Enrollment> Filtered(ReportFilter f)
    {
        var q = db.Enrollments
            .Include(e => e.Student).ThenInclude(s => s.User)
            .Include(e => e.Subject)
            .Include(e => e.Term)
            .Include(e => e.Grade)
            .Where(e => e.RequestStatus == "ENROLLED");

        if (f.Term != null) q = q.Where(e => e.TermId == f.Term);
        if (f.Program != null) q = q.Where(e => e.Subject.ProgramId == f.Program);
        if (f.YearLevel != null) q = q.Where(e => e.Subject.YearLevel == f.YearLevel);

        if (!string.IsNullOrWhiteSpace(f.Student))
        {
            var key = f.Student.Trim();
            var pk = int.TryParse(key, out var n) ? n : -1;
            q = q.Where(e => e.Student.StudentIdNo == key || e.StudentId == pk);
        }
        if (!string.IsNullOrWhiteSpace(f.Subject))
        {
            var key = f.Subject.Trim().ToUpperInvariant();
            var pk = int.TryParse(key, out var n) ? n : -1;
            q = q.Where(e => e.Subject.Code == key || e.SubjectId == pk);
        }
        return q;
    }

    private static IOrderedQueryable<Enrollment> Ordered(IQueryable<Enrollment> q) => q
        .OrderByDescending(e => e.Term.SchoolYear).ThenByDescending(e => e.Term.Semester)
        .ThenBy(e => e.Student.StudentIdNo).ThenBy(e => e.Subject.Code);

    // Exports reuse the on-screen row shape so files always match what the admin saw.
    private async Task<List<ReportRowDto>> ExportRowsAsync(ReportFilter filter)
    {
        var rows = await Ordered(Filtered(filter)).Take(ExportRowLimit).ToListAsync();
        return rows.Select(ReportRowDto.From).ToList();
    }

    private static string Fmt(decimal? v) => v?.ToString("0.00", CultureInfo.InvariantCulture) ?? "";

    // Grades go in as numbers so Excel can sort and average them; blank when not graded yet.
    private static void SetGrade(IXLCell cell, decimal? grade)
    {
        if (grade is null) return;
        cell.Value = (double)grade.Value;
        cell.Style.NumberFormat.Format = "0.00";
    }
}
