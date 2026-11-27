using SptApi.Models;

namespace SptApi.Repositories;

public interface IEnrollmentRepository
{
    Task<Enrollment?> GetForStudentAsync(int enrollmentId, int studentId);
    Task<Enrollment?> GetForGradingAsync(int studentId, int subjectId, int termId);   // includes Offering, Subject, Term, Student.User
    Task<List<Enrollment>> GetByStudentAndTermAsync(int studentId, int termId);       // includes Subject
    Task<List<Enrollment>> GetApprovedAsync(int studentId, int termId);               // includes Subject
    Task<List<Enrollment>> GetEnrolledInOfferingAsync(int offeringId);                // includes Student.User
    Task<List<Enrollment>> GetQueueAsync(string status);                              // active term only
    Task<List<Enrollment>> GetByIdsAsync(IEnumerable<int> ids);                       // includes Student, Subject
    Task<bool> AnyForStudentAsync(int studentId);
    Task AddRangeAsync(IEnumerable<Enrollment> enrollments);
    Task UpdateAsync(Enrollment enrollment);
    Task UpdateRangeAsync(IEnumerable<Enrollment> enrollments);
}
