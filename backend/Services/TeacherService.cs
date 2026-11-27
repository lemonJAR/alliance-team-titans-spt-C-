using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Mappers;
using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

public class TeacherService(
    ITeacherRepository teachers,
    IUserRepository users,
    ICollegeRepository colleges,
    ISubjectRepository subjects,
    IIdNumberService idNumbers,
    IPasswordHasher hasher,
    IAccountEmailService accountEmails,
    IAuditService audit) : ITeacherService
{
    public async Task<ServiceResult> GetAllAsync()
    {
        var rows = await teachers.GetAllWithDetailsAsync();
        return ServiceResult.Ok(rows.Select(UserMapper.ToTeacherListItem));
    }

    public async Task<ServiceResult> CreateAsync(AdminCreateTeacherRequest request)
    {
        var mail = Validation.NormalizeEmail(request.Email);
        var first = (request.FirstName ?? "").Trim();
        var last = (request.LastName ?? "").Trim();

        var errors = new Dictionary<string, string[]>();
        if (first == "") errors["first_name"] = ["First name is required."];
        if (last == "") errors["last_name"] = ["Last name is required."];
        if (!Validation.IsValidEmail(mail)) errors["email"] = ["Enter a valid email address."];
        if (errors.Count > 0) return ServiceResult.Invalid(errors);

        if (await users.EmailExistsAsync(mail)) errors["email"] = ["An account with this email already exists."];
        if (request.Department is int cid && !await colleges.ExistsAsync(cid)) errors["department"] = ["College not found."];

        var subjectIds = (request.Subjects ?? []).Distinct().ToList();
        var assigned = await subjects.GetByIdsAsync(subjectIds);
        if (assigned.Count != subjectIds.Count) errors["subjects"] = ["One or more subjects were not found."];
        if (errors.Count > 0) return ServiceResult.Invalid(errors);

        var tempPassword = PasswordRules.GenerateTemporary();
        var user = new User
        {
            Email = mail,
            PasswordHash = hasher.Hash(tempPassword),
            Role = Roles.Professor,
            FirstName = first,
            MiddleName = Validation.EmptyToNull(request.MiddleName),
            LastName = last,
            IsActive = true,
            EmailVerified = true,     // the admin vouches for this address
            DateJoined = DateTime.UtcNow
        };
        var teacher = new Teacher
        {
            User = user,
            EmployeeId = await idNumbers.NextEmployeeIdAsync(),   // assigned automatically
            CollegeId = request.Department
        };
        foreach (var s in assigned) teacher.Subjects.Add(s);

        await teachers.AddAsync(teacher);     // saves the user and the teacher together

        await audit.LogAsync("TEACHER_CREATE", "Teacher", teacher.Id,
            $"Admin created professor account {mail} ({teacher.EmployeeId})");
        await accountEmails.SendCredentialsAsync(user, tempPassword);

        return ServiceResult.Created(new
        {
            detail = "Teacher account created.",
            id = teacher.Id,
            user_id = user.Id,
            employee_id = teacher.EmployeeId
        });
    }

    public async Task<ServiceResult> UpdateSubjectsAsync(int teacherId, UpdateTeacherSubjectsRequest request)
    {
        var teacher = await teachers.GetByIdWithSubjectsAsync(teacherId);
        if (teacher is null) return ServiceResult.NotFound("Teacher not found.");

        var ids = (request.Subjects ?? []).Distinct().ToList();
        var assigned = await subjects.GetByIdsAsync(ids);
        if (assigned.Count != ids.Count) return ServiceResult.Invalid("subjects", "One or more subjects were not found.");

        teacher.Subjects.Clear();
        foreach (var s in assigned) teacher.Subjects.Add(s);
        await teachers.UpdateAsync(teacher);

        await audit.LogAsync("TEACHER_SUBJECTS_UPDATE", "Teacher", teacher.Id,
            $"Subjects set to: {string.Join(", ", assigned.Select(s => s.Code))}");
        return ServiceResult.Ok(new { detail = "Subjects updated." });
    }
}
