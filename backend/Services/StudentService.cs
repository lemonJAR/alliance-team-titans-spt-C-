using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Mappers;
using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

public class StudentService(
    IStudentRepository students,
    IUserRepository users,
    IProgramRepository programs,
    IEnrollmentRepository enrollments,
    IIdNumberService idNumbers,
    IPasswordHasher hasher,
    IAccountEmailService accountEmails,
    IAuditService audit) : IStudentService
{
    public async Task<ServiceResult> GetAllAsync()
    {
        var rows = await students.GetAllWithDetailsAsync();
        return ServiceResult.Ok(rows.Select(UserMapper.ToStudentListItem));
    }

    public async Task<ServiceResult> CreateAsync(AdminCreateStudentRequest request)
    {
        var mail = Validation.NormalizeEmail(request.Email);
        var first = (request.FirstName ?? "").Trim();
        var last = (request.LastName ?? "").Trim();

        var errors = new Dictionary<string, string[]>();
        if (first == "") errors["first_name"] = ["First name is required."];
        if (last == "") errors["last_name"] = ["Last name is required."];
        if (!Validation.IsValidEmail(mail)) errors["email"] = ["Enter a valid email address."];
        if (request.YearLevel is < 1 or > 6) errors["year_level"] = ["Year level must be between 1 and 6."];
        if (errors.Count > 0) return ServiceResult.Invalid(errors);

        if (await users.EmailExistsAsync(mail)) errors["email"] = ["An account with this email already exists."];
        if (request.Program is int pid && !await programs.ExistsAsync(pid)) errors["program"] = ["Program not found."];
        if (errors.Count > 0) return ServiceResult.Invalid(errors);

        var tempPassword = PasswordRules.GenerateTemporary();
        var user = new User
        {
            Email = mail,
            PasswordHash = hasher.Hash(tempPassword),
            Role = Roles.Student,
            FirstName = first,
            MiddleName = Validation.EmptyToNull(request.MiddleName),
            LastName = last,
            IsActive = true,
            EmailVerified = true,
            DateJoined = DateTime.UtcNow
        };
        var student = new Student
        {
            User = user,
            StudentIdNo = await idNumbers.NextStudentIdAsync(),   // assigned automatically
            ProgramId = request.Program,
            YearLevel = (sbyte)(request.YearLevel ?? 1)
        };

        await students.AddAsync(student);     // saves the user and the student together

        await audit.LogAsync("STUDENT_CREATE", "Student", student.Id,
            $"Admin created student account {mail} ({student.StudentIdNo})");
        await accountEmails.SendCredentialsAsync(user, tempPassword);

        return ServiceResult.Created(new
        {
            detail = "Student account created.",
            id = student.Id,
            user_id = user.Id,
            student_id = student.StudentIdNo
        });
    }

    // Removes a pre-loaded student ID that nobody has registered with. Anything with an account or
    // enrollment history is kept; deactivate the account instead.
    public async Task<ServiceResult> RemoveUnregisteredAsync(int studentId)
    {
        var student = await students.GetByIdAsync(studentId);
        if (student is null) return ServiceResult.NotFound("Student record not found.");
        if (student.UserId != null)
            return ServiceResult.BadRequest("This student ID has an account. Delete or deactivate the account instead.");
        if (await enrollments.AnyForStudentAsync(studentId))
            return ServiceResult.Conflict("This student ID has enrollments on record and cannot be removed.");

        await students.DeleteAsync(student);
        await audit.LogAsync("STUDENT_ID_REMOVE", "Student", studentId, $"Admin removed unregistered student ID {student.StudentIdNo}");
        return ServiceResult.Ok(new { detail = "Student ID removed." });
    }
}
