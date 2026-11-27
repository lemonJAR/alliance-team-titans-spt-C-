using SptApi.Models;

namespace SptApi.Services;

// Who may see or change a grade.
//   Admin     - any grade, any term
//   Professor - grades in sections assigned to them, active term only
//   Student   - read own grades only
public interface IGradeAccessPolicy
{
    Task<Teacher?> CurrentTeacherAsync();
    Task<Student?> CurrentStudentAsync();
    Task<bool> CanManageAsync(Enrollment enrollment);
    Task<bool> CanReadAsync(Grade grade);
    bool IsTermOpenForEditing(Enrollment enrollment);
}
