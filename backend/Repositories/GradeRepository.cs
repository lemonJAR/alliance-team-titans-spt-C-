using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Dtos.Queries;
using SptApi.Models;

namespace SptApi.Repositories;

public class GradeRepository(SptDbContext db) : IGradeRepository
{
    private IQueryable<Grade> WithDetails() => db.Grades
        .Include(g => g.Enrollment).ThenInclude(e => e.Student).ThenInclude(s => s.User)
        .Include(g => g.Enrollment).ThenInclude(e => e.Subject)
        .Include(g => g.Enrollment).ThenInclude(e => e.Term)
        .Include(g => g.Enrollment).ThenInclude(e => e.Offering);

    public Task<Grade?> GetByIdWithDetailsAsync(int id) =>
        WithDetails().FirstOrDefaultAsync(g => g.Id == id);

    public Task<List<Grade>> GetForStudentAsync(int studentId) =>
        WithDetails()
            .Where(g => g.Enrollment.StudentId == studentId)
            .OrderByDescending(g => g.Enrollment.Term.SchoolYear)
            .ThenByDescending(g => g.Enrollment.Term.Semester)
            .ThenBy(g => g.Enrollment.Subject.Code)
            .ToListAsync();

    public Task<List<Grade>> GetFilteredAsync(GradeFilter filter, int limit)
    {
        var q = WithDetails();

        if (filter.TeacherId != null)
            q = q.Where(g => g.Enrollment.Offering != null && g.Enrollment.Offering.TeacherId == filter.TeacherId);
        if (filter.OfferingId != null) q = q.Where(g => g.Enrollment.OfferingId == filter.OfferingId);
        if (filter.StudentId != null) q = q.Where(g => g.Enrollment.StudentId == filter.StudentId);
        if (filter.TermId != null) q = q.Where(g => g.Enrollment.TermId == filter.TermId);
        if (filter.SubjectId != null) q = q.Where(g => g.Enrollment.SubjectId == filter.SubjectId);

        q = filter.Period switch
        {
            "prelim" => q.Where(g => g.Prelim != null),
            "midterm" => q.Where(g => g.Midterm != null),
            "finals" => q.Where(g => g.Finals != null),
            _ => q
        };

        return q.OrderBy(g => g.Enrollment.Student.StudentIdNo)
            .ThenBy(g => g.Enrollment.Subject.Code)
            .Take(limit)
            .ToListAsync();
    }

    public Task<bool> ExistsForEnrollmentAsync(int enrollmentId) =>
        db.Grades.AnyAsync(g => g.EnrollmentId == enrollmentId);

    public Task<bool> HasPassedSubjectAsync(int studentId, int subjectId, decimal passingGrade) =>
        db.Grades.AnyAsync(g => g.Enrollment.StudentId == studentId && g.Enrollment.SubjectId == subjectId
                                && g.Finals != null && g.Finals <= passingGrade);

    public async Task AddAsync(Grade grade)
    {
        db.Grades.Add(grade);
        await db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Grade grade)
    {
        db.TrackForUpdate(grade);
        await db.SaveChangesAsync();
    }

    public async Task DeleteAsync(Grade grade)
    {
        db.Grades.Remove(grade);
        await db.SaveChangesAsync();
    }
}
