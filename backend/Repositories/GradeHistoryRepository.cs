using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;

namespace SptApi.Repositories;

public class GradeHistoryRepository(SptDbContext db) : IGradeHistoryRepository
{
    public Task<List<GradeHistory>> GetForGradeAsync(int gradeId) =>
        db.GradeHistories.Where(h => h.GradeId == gradeId)
            .OrderByDescending(h => h.ChangedAt).ThenByDescending(h => h.Id)
            .ToListAsync();

    public Task<List<GradeHistory>> GetTimelineAsync(int? studentId, int? teacherId, int limit)
    {
        var grades = db.Grades.AsQueryable();
        if (studentId != null) grades = grades.Where(g => g.Enrollment.StudentId == studentId);
        if (teacherId != null)
            grades = grades.Where(g => g.Enrollment.Offering != null && g.Enrollment.Offering.TeacherId == teacherId);

        var gradeIds = grades.Select(g => g.Id);
        return db.GradeHistories.Where(h => gradeIds.Contains(h.GradeId))
            .OrderByDescending(h => h.ChangedAt).ThenByDescending(h => h.Id)
            .Take(limit)
            .ToListAsync();
    }

    public async Task AddAsync(GradeHistory entry)
    {
        db.GradeHistories.Add(entry);
        await db.SaveChangesAsync();
    }
}
