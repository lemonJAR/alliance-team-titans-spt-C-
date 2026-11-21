using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Dtos;
using SptApi.Models;

namespace SptApi.Services;

// Read-only grade queries: a student's own grades and the grade history timeline.
// Creating, editing and deleting grades stays in GradesController.
public class GradeQueryService(SptDbContext db)
{
    public const int TimelineLimit = 200;

    public Task<Student?> FindStudentAsync(int? userId) =>
        userId is null ? Task.FromResult<Student?>(null) : db.Students.FirstOrDefaultAsync(s => s.UserId == userId);

    public Task<Teacher?> FindTeacherAsync(int? userId) =>
        userId is null ? Task.FromResult<Teacher?>(null) : db.Teachers.FirstOrDefaultAsync(t => t.UserId == userId);

    public async Task<List<GradeDto>> GetStudentGradesAsync(Student student)
    {
        var rows = await WithDetails()
            .Where(g => g.Enrollment.StudentId == student.Id)
            .OrderByDescending(g => g.Enrollment.Term.SchoolYear)
            .ThenByDescending(g => g.Enrollment.Term.Semester)
            .ThenBy(g => g.Enrollment.Subject.Code)
            .ToListAsync();

        return rows.Select(GradeDto.From).ToList();
    }

    public Task<List<GradeHistoryDto>> GetTimelineForStudentAsync(Student student) =>
        TimelineOf(db.Grades.Where(g => g.Enrollment.StudentId == student.Id));

    // Only grades in sections assigned to this teacher.
    public Task<List<GradeHistoryDto>> GetTimelineForTeacherAsync(Teacher teacher, int? studentId)
    {
        var grades = db.Grades.Where(g => g.Enrollment.Offering != null && g.Enrollment.Offering.TeacherId == teacher.Id);
        if (studentId != null) grades = grades.Where(g => g.Enrollment.StudentId == studentId);
        return TimelineOf(grades);
    }

    public Task<List<GradeHistoryDto>> GetTimelineForAdminAsync(int? studentId)
    {
        var grades = db.Grades.AsQueryable();
        if (studentId != null) grades = grades.Where(g => g.Enrollment.StudentId == studentId);
        return TimelineOf(grades);
    }

    // Returns null when the caller may not see the grade, so the controller can answer 404 without
    // revealing whether it exists. A deleted grade has no owner left to check, so only admins can read its trail.
    public async Task<List<GradeHistoryDto>?> GetGradeHistoryAsync(int gradeId, int? userId, string? role)
    {
        var grade = await db.Grades
            .Include(g => g.Enrollment).ThenInclude(e => e.Offering)
            .FirstOrDefaultAsync(g => g.Id == gradeId);

        var allowed = grade is null ? role == Roles.Admin : await CanReadAsync(grade, userId, role);
        if (!allowed) return null;

        var history = await db.GradeHistories.Where(h => h.GradeId == gradeId)
            .OrderByDescending(h => h.ChangedAt).ThenByDescending(h => h.Id).ToListAsync();
        return await ToHistoryDtosAsync(history);
    }

    // ───── helpers ─────

    private IQueryable<Grade> WithDetails() => db.Grades
        .Include(g => g.Enrollment).ThenInclude(e => e.Student).ThenInclude(s => s.User)
        .Include(g => g.Enrollment).ThenInclude(e => e.Subject)
        .Include(g => g.Enrollment).ThenInclude(e => e.Term)
        .Include(g => g.Enrollment).ThenInclude(e => e.Offering);

    private async Task<List<GradeHistoryDto>> TimelineOf(IQueryable<Grade> grades)
    {
        // Kept as a query (not a list) so EF Core sends a single SQL statement with a sub-select.
        var gradeIds = grades.Select(g => g.Id);
        var history = await db.GradeHistories.Where(h => gradeIds.Contains(h.GradeId))
            .OrderByDescending(h => h.ChangedAt).ThenByDescending(h => h.Id)
            .Take(TimelineLimit).ToListAsync();
        return await ToHistoryDtosAsync(history);
    }

    private async Task<bool> CanReadAsync(Grade grade, int? userId, string? role)
    {
        if (role == Roles.Admin) return true;
        if (role == Roles.Professor)
        {
            var teacher = await FindTeacherAsync(userId);
            return teacher != null && grade.Enrollment.Offering?.TeacherId == teacher.Id;
        }
        if (role == Roles.Student)
        {
            var student = await FindStudentAsync(userId);
            return student != null && grade.Enrollment.StudentId == student.Id;
        }
        return false;
    }

    private async Task<List<GradeHistoryDto>> ToHistoryDtosAsync(List<GradeHistory> history)
    {
        var userIds = history.Select(h => h.ChangedBy).Distinct().ToList();
        var names = await db.Users.Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}");

        return history.Select(h =>
        {
            var oldValues = ParseJson(h.OldValues);
            var newValues = ParseJson(h.NewValues);
            return new GradeHistoryDto(
                h.Id, h.GradeId, h.Action, h.ChangedBy, names.GetValueOrDefault(h.ChangedBy),
                oldValues, newValues,
                Current: newValues ?? oldValues,
                CreatedAt: h.ChangedAt);
        }).ToList();
    }

    private static JsonElement? ParseJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<JsonElement>(json); }
        catch (JsonException) { return null; }
    }
}
