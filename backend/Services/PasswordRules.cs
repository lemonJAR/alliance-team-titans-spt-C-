namespace SptApi.Services;

public static class PasswordRules
{
    // Returns an error message, or null if the password is acceptable.
    public static string? Validate(string? password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < 8)
            return "Password must be at least 8 characters.";
        if (System.Text.Encoding.UTF8.GetByteCount(password) > 72)
            return "Password is too long (maximum 72 characters).";   // BCrypt ignores anything past 72 bytes
        if (!password.Any(char.IsLetter) || !password.Any(char.IsDigit))
            return "Password must contain at least one letter and one number.";
        return null;
    }
}