using SptApi.Common;
using SptApi.Models;

namespace SptApi.Mappers;

// Converts users and their role profiles into the JSON shapes the frontend reads.
public static class UserMapper
{
    public static object ToSessionDto(User u) => new
    {
        id = u.Id,
        email = u.Email,
        role = u.Role,
        first_name = u.FirstName,
        middle_name = u.MiddleName,
        last_name = u.LastName,
        email_verified = u.EmailVerified,
        student_id_no = u.Student?.StudentIdNo,
        employee_id = u.Teacher?.EmployeeId
    };

    public static object ToAdminProfileDto(User u) => new
    {
        id = u.Id,
        email = u.Email,
        first_name = u.FirstName,
        middle_name = u.MiddleName,
        last_name = u.LastName
    };

    public static object ToStudentProfileDto(Student s) => new
    {
        id = s.Id,
        user_id = s.UserId,
        email = s.User?.Email,
        first_name = s.User?.FirstName,
        middle_name = s.User?.MiddleName,
        last_name = s.User?.LastName,
        student_id = s.StudentIdNo,
        program = s.ProgramId,
        program_code = s.Program?.Code,
        program_name = s.Program?.Name,
        year_level = s.YearLevel
    };

    public static object ToTeacherProfileDto(Teacher t) => new
    {
        id = t.Id,
        user_id = t.UserId,
        email = t.User.Email,
        first_name = t.User.FirstName,
        middle_name = t.User.MiddleName,
        last_name = t.User.LastName,
        teacher_id = t.EmployeeId,
        college = t.CollegeId,
        college_name = t.College?.Name,
        department_code = t.DepartmentCode
    };

    // Admin "People" directory rows.
    public static object ToTeacherListItem(Teacher t) => new
    {
        id = t.Id,
        user_id = t.UserId,
        employee_id = t.EmployeeId,
        department = t.College != null ? t.College.Name : (t.DepartmentCode ?? "Unassigned"),
        department_id = t.CollegeId,
        email = t.User.Email,
        first_name = t.User.FirstName,
        middle_name = t.User.MiddleName,
        last_name = t.User.LastName,
        full_name = Validation.FullName(t.User.FirstName, t.User.MiddleName, t.User.LastName),
        is_active = t.User.IsActive ?? true,
        email_verified = t.User.EmailVerified,
        pending_approval = t.User.IsActive == false,
        subjects = t.Subjects.Select(s => new { id = s.Id, code = s.Code, name = s.Name })
    };

    public static object ToStudentListItem(Student s) => new
    {
        id = s.Id,
        user_id = s.UserId,
        student_id = s.StudentIdNo,
        program = s.ProgramId,
        program_code = s.Program?.Code,
        program_name = s.Program?.Name,
        year_level = s.YearLevel,
        registered = s.User != null,     // false = pre-loaded ID that hasn't signed up yet
        email = s.User?.Email,
        first_name = s.User?.FirstName,
        middle_name = s.User?.MiddleName,
        last_name = s.User?.LastName,
        full_name = s.User is null ? null : Validation.FullName(s.User.FirstName, s.User.MiddleName, s.User.LastName),
        is_active = s.User?.IsActive ?? true,
        date_joined = s.User?.DateJoined
    };

    // "Lastname, Firstname", or the ID number for a pre-loaded student without an account.
    public static string StudentDisplayName(Student s) =>
        s.User is null ? s.StudentIdNo : $"{s.User.LastName}, {s.User.FirstName}";
}
