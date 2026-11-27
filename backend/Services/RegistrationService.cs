using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

public class RegistrationService(
    IUserRepository users,
    IStudentRepository students,
    ITeacherRepository teachers,
    IIdNumberService idNumbers,
    IPasswordHasher hasher,
    IEmailTokenService emailTokens,
    IAccountEmailService accountEmails,
    IUnitOfWork unitOfWork,
    IAuditService audit,
    IConfiguration config) : IRegistrationService
{
    private const string VerifiedMessage = "Email verified. You can now sign in.";

    public async Task<ServiceResult> CheckStudentIdAsync(VerifyStudentRequest request)
    {
        var id = (request.StudentId ?? "").Trim();
        var exists = id != "" && await students.StudentIdNoExistsAsync(id);
        return ServiceResult.Ok(new { exists });
    }

    public async Task<ServiceResult> RegisterAsync(RegisterRequest request)
    {
        var mail = Validation.NormalizeEmail(request.Email);
        var role = (request.Role ?? "").Trim().ToUpperInvariant();
        var first = (request.FirstName ?? "").Trim();
        var last = (request.LastName ?? "").Trim();

        var errors = new Dictionary<string, string[]>();
        if (first == "") errors["first_name"] = ["First name is required."];
        if (last == "") errors["last_name"] = ["Last name is required."];
        if (!Validation.IsValidEmail(mail)) errors["email"] = ["Enter a valid email address."];
        if (role != Roles.Student && role != Roles.Professor) errors["role"] = ["Role must be STUDENT or PROFESSOR."];

        var pwError = PasswordRules.Validate(request.Password);
        if (pwError != null) errors["password"] = [pwError];
        else if (request.Password != request.ConfirmPassword) errors["confirm_password"] = ["Passwords do not match."];
        if (errors.Count > 0) return ServiceResult.Invalid(errors);

        if (await users.EmailExistsAsync(mail)) errors["email"] = ["An account with this email already exists."];

        // A student signs up with the ID number the registrar already loaded for them.
        Student? student = null;
        if (role == Roles.Student)
        {
            var sid = (request.StudentId ?? "").Trim();
            if (sid == "") errors["student_id"] = ["Student ID is required."];
            else
            {
                student = await students.GetByStudentIdNoAsync(sid);
                if (student is null) errors["student_id"] = ["Student ID not found. Please contact the registrar."];
                else if (student.UserId != null) errors["student_id"] = ["This student ID is already registered."];
            }
        }
        if (errors.Count > 0) return ServiceResult.Invalid(errors);

        // Anyone can open the sign-up page, so a self-registered professor must be approved by an admin
        // before they can log in. Turn off with Registration:ProfessorsNeedApproval = false.
        var needsApproval = config.GetValue("Registration:ProfessorsNeedApproval", true);

        var user = new User
        {
            Email = mail,
            PasswordHash = hasher.Hash(request.Password!),
            Role = role,
            FirstName = first,
            MiddleName = Validation.EmptyToNull(request.MiddleName),
            LastName = last,
            IsActive = !(role == Roles.Professor && needsApproval),
            EmailVerified = false,
            DateJoined = DateTime.UtcNow
        };

        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            await users.AddAsync(user);
            if (student != null)
            {
                student.UserId = user.Id;                       // link the pre-loaded student record
                await students.UpdateAsync(student);
            }
            else
            {
                // Professors get the next employee ID automatically.
                await teachers.AddAsync(new Teacher { UserId = user.Id, EmployeeId = await idNumbers.NextEmployeeIdAsync() });
            }
        });

        await audit.LogAsync("REGISTER", "User", user.Id, $"New {role} account registered",
            actorId: user.Id, email: user.Email, role: user.Role);
        await accountEmails.SendVerificationAsync(user);

        return ServiceResult.Created(new { message = "Account created. Please check your email to verify your address." });
    }

    public async Task<ServiceResult> VerifyEmailAsync(string token)
    {
        const string failed = "Verification failed or link has expired.";

        var rec = await emailTokens.FindAsync(token, IEmailTokenService.Verify);
        if (rec is null) return ServiceResult.BadRequestError(failed);

        // Already verified (e.g. the page called this twice): treat as success.
        if (rec.User.EmailVerified) return ServiceResult.Ok(new { message = VerifiedMessage });
        if (rec.UsedAt != null || rec.ExpiresAt < DateTime.UtcNow) return ServiceResult.BadRequestError(failed);

        rec.User.EmailVerified = true;
        await users.UpdateAsync(rec.User);
        await emailTokens.MarkUsedAsync(rec);

        await audit.LogAsync("EMAIL_VERIFIED", "User", rec.User.Id, "Email address verified",
            actorId: rec.User.Id, email: rec.User.Email, role: rec.User.Role);
        return ServiceResult.Ok(new { message = VerifiedMessage });
    }

    public async Task<ServiceResult> ResendVerificationAsync(EmailRequest request)
    {
        var user = await users.GetByEmailAsync(Validation.NormalizeEmail(request.Email));
        if (user is { EmailVerified: false }) await accountEmails.SendVerificationAsync(user);

        // Same answer whether or not the account exists, so this can't be used to discover registered emails.
        return ServiceResult.Ok(new { message = "If that account exists and is not yet verified, a new link has been sent." });
    }
}
