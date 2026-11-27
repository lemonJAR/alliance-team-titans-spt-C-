using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Dtos.Queries;
using SptApi.Models;

namespace SptApi.Repositories;

public class GradeReportRepository(SptDbContext db) : IGradeReportRepository
{
    // Counted in the database so the numbers are right even when the row list is capped.
    public async Task<ReportSummary> GetSummaryAsync(ReportFilter filter, decimal passingGrade)
    {
        var q = Filtered(filter);
        var total = await q.CountAsync();
        var graded = await q.CountAsync(e => e.Grade != null && e.Grade.Finals != null);
        var passing = await q.CountAsync(e => e.Grade != null && e.Grade.Finals != null && e.Grade.Finals <= passingGrade);
        return new ReportSummary(total, graded, passing, graded - passing);
    }

    public Task<List<Enrollment>> GetRowsAsync(ReportFilter filter, int limit) =>
        Filtered(filter)
            .OrderByDescending(e => e.Term.SchoolYear).ThenByDescending(e => e.Term.Semester)
            .ThenBy(e => e.Student.StudentIdNo).ThenBy(e => e.Subject.Code)
            .Take(limit)
            .ToListAsync();

    private IQueryable<Enrollment> Filtered(ReportFilter filter)
    {
        var q = db.Enrollments
            .Include(e => e.Student).ThenInclude(s => s.User)
            .Include(e => e.Subject)
            .Include(e => e.Term)
            .Include(e => e.Grade)
            .Where(e => e.RequestStatus == EnrollmentStatus.Enrolled);

        if (filter.TermId != null) q = q.Where(e => e.TermId == filter.TermId);
        if (filter.ProgramId != null) q = q.Where(e => e.Subject.ProgramId == filter.ProgramId);
        if (filter.YearLevel != null) q = q.Where(e => e.Subject.YearLevel == filter.YearLevel);

        if (!string.IsNullOrWhiteSpace(filter.Student))
        {
            var key = filter.Student.Trim();
            var pk = int.TryParse(key, out var n) ? n : -1;
            q = q.Where(e => e.Student.StudentIdNo == key || e.StudentId == pk);
        }
        if (!string.IsNullOrWhiteSpace(filter.Subject))
        {
            var key = filter.Subject.Trim().ToUpperInvariant();
            var pk = int.TryParse(key, out var n) ? n : -1;
            q = q.Where(e => e.Subject.Code == key || e.SubjectId == pk);
        }
        return q;
    }
}
