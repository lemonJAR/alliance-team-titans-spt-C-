using System.Security.Cryptography;

namespace SptApi.Common;

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

    // 12 random characters, always with letters and digits so it passes Validate.
    // Look-alike characters (0/O, 1/l/I) are left out so a temporary password is easy to type.
    public static string GenerateTemporary()
    {
        const string letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
        const string digits = "23456789";
        var chars = new char[12];
        for (var i = 0; i < chars.Length; i++)
        {
            var set = i % 3 == 2 ? digits : letters;
            chars[i] = set[RandomNumberGenerator.GetInt32(set.Length)];
        }
        return new string(chars);
    }
}
