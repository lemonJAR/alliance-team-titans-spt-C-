using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;

namespace SptApi.Repositories;

public class EnrollmentRepository(SptDbContext db) : IEnrollmentRepository
{
    public Task<Enrollment?> GetForStudentAsync(int enrollmentId, int studentId) =>
        db.Enrollments.FirstOrDefaultAsync(e => e.Id == enrollmentId && e.StudentId == studentId);

    public Task<Enrollment?> GetForGradingAsync(int studentId, int subjectId, int termId) =>
        db.Enrollments
            .Include(e => e.Offering)
            .Include(e => e.Subject)
            .Include(e => e.Term)
            .Include(e => e.Student).ThenInclude(s => s.User)
            .FirstOrDefaultAsync(e => e.StudentId == studentId && e.SubjectId == subjectId && e.TermId == termId);

    public Task<List<Enrollment>> GetByStudentAndTermAsync(int studentId, int termId) =>
        db.Enrollments.Include(e => e.Subject)
            .Where(e => e.StudentId == studentId && e.TermId == termId)
            .ToListAsync();

    public Task<List<Enrollment>> GetApprovedAsync(int studentId, int termId) =>
        db.Enrollments.Include(e => e.Subject)
            .Where(e => e.StudentId == studentId && e.TermId == termId && e.RequestStatus == EnrollmentStatus.Approved)
            .OrderBy(e => e.Subject.Code)
            .ToListAsync();

    public Task<List<Enrollment>> GetEnrolledInOfferingAsync(int offeringId) =>
        db.Enrollments
            .Include(e => e.Student).ThenInclude(s => s.User)
            .Where(e => e.OfferingId == offeringId && e.RequestStatus == EnrollmentStatus.Enrolled)
            .OrderBy(e => e.Student.User!.LastName).ThenBy(e => e.Student.User!.FirstName)
            .ToListAsync();

    public Task<List<Enrollment>> GetQueueAsync(string status) =>
        db.Enrollments
            .Include(e => e.Student).ThenInclude(s => s.User)
            .Include(e => e.Student).ThenInclude(s => s.Program)
            .Include(e => e.Subject)
            .Where(e => e.Term.IsActive && e.RequestStatus == status)
            .OrderBy(e => e.Student.YearLevel).ThenBy(e => e.Subject.Code).ThenBy(e => e.CreatedAt)
            .ToListAsync();

    public Task<List<Enrollment>> GetByIdsAsync(IEnumerable<int> ids)
    {
        var list = ids.ToList();
        return db.Enrollments.Include(e => e.Student).Include(e => e.Subject)
            .Where(e => list.Contains(e.Id)).ToListAsync();
    }

    public Task<bool> AnyForStudentAsync(int studentId) =>
        db.Enrollments.AnyAsync(e => e.StudentId == studentId);

    public async Task AddRangeAsync(IEnumerable<Enrollment> enrollments)
    {
        db.Enrollments.AddRange(enrollments);
        await db.SaveChangesAsync();
    }

    public async Task UpdateAsync(Enrollment enrollment)
    {
        db.TrackForUpdate(enrollment);
        await db.SaveChangesAsync();
    }

    public async Task UpdateRangeAsync(IEnumerable<Enrollment> enrollments)
    {
        db.TrackForUpdate(enrollments);
        await db.SaveChangesAsync();
    }
}
