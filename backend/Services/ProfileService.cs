using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Mappers;
using SptApi.Repositories;

namespace SptApi.Services;

public class ProfileService(
    IUserRepository users,
    IStudentRepository students,
    ITeacherRepository teachers,
    IUserNameService names,
    ICurrentUser currentUser) : IProfileService
{
    private const string NoStudent = "No student profile for this account.";
    private const string NoTeacher = "No teacher profile for this account.";

    public async Task<ServiceResult> GetStudentAsync()
    {
        var student = currentUser.UserId is int id ? await students.GetByUserIdWithDetailsAsync(id) : null;
        return student is null ? ServiceResult.NotFound(NoStudent) : ServiceResult.Ok(UserMapper.ToStudentProfileDto(student));
    }

    public async Task<ServiceResult> UpdateStudentAsync(UpdateNameRequest request)
    {
        var student = currentUser.UserId is int id ? await students.GetByUserIdWithDetailsAsync(id) : null;
        if (student?.User is null) return ServiceResult.NotFound(NoStudent);

        var errors = await names.UpdateOwnNameAsync(student.User, request);
        return errors is null ? ServiceResult.Ok(UserMapper.ToStudentProfileDto(student)) : ServiceResult.Invalid(errors);
    }

    public async Task<ServiceResult> GetTeacherAsync()
    {
        var teacher = currentUser.UserId is int id ? await teachers.GetByUserIdWithDetailsAsync(id) : null;
        return teacher is null ? ServiceResult.NotFound(NoTeacher) : ServiceResult.Ok(UserMapper.ToTeacherProfileDto(teacher));
    }

    public async Task<ServiceResult> UpdateTeacherAsync(UpdateNameRequest request)
    {
        var teacher = currentUser.UserId is int id ? await teachers.GetByUserIdWithDetailsAsync(id) : null;
        if (teacher is null) return ServiceResult.NotFound(NoTeacher);

        var errors = await names.UpdateOwnNameAsync(teacher.User, request);
        return errors is null ? ServiceResult.Ok(UserMapper.ToTeacherProfileDto(teacher)) : ServiceResult.Invalid(errors);
    }

    public async Task<ServiceResult> GetAdminAsync()
    {
        var user = currentUser.UserId is int id ? await users.GetByIdAsync(id) : null;
        return user is null ? ServiceResult.Unauthorized() : ServiceResult.Ok(UserMapper.ToAdminProfileDto(user));
    }

    public async Task<ServiceResult> UpdateAdminAsync(UpdateNameRequest request)
    {
        var user = currentUser.UserId is int id ? await users.GetByIdAsync(id) : null;
        if (user is null) return ServiceResult.Unauthorized();

        var errors = await names.UpdateOwnNameAsync(user, request);
        return errors is null ? ServiceResult.Ok(UserMapper.ToAdminProfileDto(user)) : ServiceResult.Invalid(errors);
    }

    // Only stores the token; nothing sends push notifications yet. Empty or null clears it.
    public async Task<ServiceResult> UpdatePushTokenAsync(FcmTokenRequest request)
    {
        var user = currentUser.UserId is int id ? await users.GetByIdAsync(id) : null;
        if (user is null) return ServiceResult.Unauthorized();

        var token = Validation.EmptyToNull(request.FcmToken);
        if (token is { Length: > 255 }) return ServiceResult.Invalid("fcm_token", "Token is too long.");

        user.FcmToken = token;
        await users.UpdateAsync(user);
        return ServiceResult.Ok(new { detail = token is null ? "Push token cleared." : "Push token saved." });
    }
}
