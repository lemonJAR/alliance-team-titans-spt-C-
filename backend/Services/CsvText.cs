namespace SptApi.Services;

// Safe text for CSV and Excel cells.
public static class CsvText
{
    // A cell starting with = + - or @ can run as a formula when opened in Excel. Names and remarks are typed by
    // users, so prefix those with an apostrophe to keep them as plain text.
    public static string Defuse(string? value)
    {
        value ??= "";
        return value.Length > 0 && "=+-@".Contains(value[0]) ? "'" + value : value;
    }

    // One CSV cell: formula-safe, and quoted when it contains a comma, quote or line break.
    public static string Cell(string? value)
    {
        var v = Defuse(value);
        return v.IndexOfAny([',', '"', '\n', '\r']) >= 0 ? "\"" + v.Replace("\"", "\"\"") + "\"" : v;
    }
}