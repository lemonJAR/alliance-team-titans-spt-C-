namespace SptApi.Common;

// Small input checks shared by several services.
public static class Validation
{
    public static bool IsValidEmail(string mail) =>
        System.Net.Mail.MailAddress.TryCreate(mail, out var parsed) && parsed.Address == mail;

    public static string NormalizeEmail(string? email) => (email ?? "").Trim().ToLowerInvariant();

    public static string? EmptyToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    // Code + name pair used by colleges, programs and subjects.
    public static void CheckCodeAndName(Dictionary<string, string[]> errors, string code, string name)
    {
        if (code == "") errors["code"] = ["Code is required."];
        else if (code.Length > 20) errors["code"] = ["Code must be 20 characters or fewer."];
        if (name == "") errors["name"] = ["Name is required."];
        else if (name.Length > 150) errors["name"] = ["Name must be 150 characters or fewer."];
    }

    public static string FullName(string first, string? middle, string last) =>
        string.Join(" ", new[] { first, middle, last }.Where(s => !string.IsNullOrWhiteSpace(s)));
}
