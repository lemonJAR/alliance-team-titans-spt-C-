namespace SptApi.Dtos.Requests;

// Request bodies for sign-in, sign-up, email links and passwords.
// JSON is snake_case (first_name, confirm_password ...), mapped by the serializer in Program.cs.

public class LoginRequest
{
    public string? Email { get; set; }
    public string? Password { get; set; }
}

public class RegisterRequest
{
    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }
    public string? Role { get; set; }
    public string? Password { get; set; }
    public string? ConfirmPassword { get; set; }
    // Students sign up with the ID the registrar gave them. Professors get an employee ID generated for them.
    public string? StudentId { get; set; }
}

public class VerifyStudentRequest
{
    public string? StudentId { get; set; }
}

public class EmailRequest
{
    public string? Email { get; set; }
}

public class ResetPasswordRequest
{
    public string? Token { get; set; }
    public string? NewPassword { get; set; }
}

public class ChangePasswordRequest
{
    public string? CurrentPassword { get; set; }
    public string? NewPassword { get; set; }
}

public class UpdateNameRequest
{
    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }
}

public class FcmTokenRequest
{
    public string? FcmToken { get; set; }
}
