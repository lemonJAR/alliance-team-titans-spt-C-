using SptApi.Models;

namespace SptApi.Repositories;

public interface IGradeHistoryRepository
{
    Task<List<GradeHistory>> GetForGradeAsync(int gradeId);
    // History of grades that still exist, limited to one student and/or one teacher's sections.
    Task<List<GradeHistory>> GetTimelineAsync(int? studentId, int? teacherId, int limit);
    Task AddAsync(GradeHistory entry);
}
