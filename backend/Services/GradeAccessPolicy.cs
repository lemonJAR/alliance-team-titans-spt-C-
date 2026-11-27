using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

public class GradeAccessPolicy(
    ITeacherRepository teachers,
    IStudentRepository students,
    ICurrentUser currentUser) : IGradeAccessPolicy
{
    // Cached per request: a single call may check several grades.
    private Teacher? teacher;
    private Student? student;

    public async Task<Teacher?> CurrentTeacherAsync()
    {
        if (teacher is null && currentUser.IsProfessor && currentUser.UserId is int id)
            teacher = await teachers.GetByUserIdAsync(id);
        return teacher;
    }

    public async Task<Student?> CurrentStudentAsync()
    {
        if (student is null && currentUser.IsStudent && currentUser.UserId is int id)
            student = await students.GetByUserIdAsync(id);
        return student;
    }

    public async Task<bool> CanManageAsync(Enrollment enrollment)
    {
        if (currentUser.IsAdmin) return true;
        var me = await CurrentTeacherAsync();
        return me != null && enrollment.Offering?.TeacherId == me.Id;
    }

    public async Task<bool> CanReadAsync(Grade grade)
    {
        if (await CanManageAsync(grade.Enrollment)) return true;
        var me = await CurrentStudentAsync();
        return me != null && grade.Enrollment.StudentId == me.Id;
    }

    // Professors can only change grades in the active term; admins can override any term.
    public bool IsTermOpenForEditing(Enrollment enrollment) => currentUser.IsAdmin || enrollment.Term.IsActive;
}
