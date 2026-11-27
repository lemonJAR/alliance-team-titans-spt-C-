using SptApi.Dtos.Queries;
using SptApi.Models;

namespace SptApi.Repositories;

public interface IGradeRepository
{
    Task<Grade?> GetByIdWithDetailsAsync(int id);          // includes Enrollment with Student.User, Subject, Term, Offering
    Task<List<Grade>> GetForStudentAsync(int studentId);   // newest term first
    Task<List<Grade>> GetFilteredAsync(GradeFilter filter, int limit);
    Task<bool> ExistsForEnrollmentAsync(int enrollmentId);
    Task<bool> HasPassedSubjectAsync(int studentId, int subjectId, decimal passingGrade);
    Task AddAsync(Grade grade);
    Task UpdateAsync(Grade grade);
    Task DeleteAsync(Grade grade);
}
