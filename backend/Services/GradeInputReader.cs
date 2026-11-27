using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using SptApi.Common;
using SptApi.Models;

namespace SptApi.Services;

// Reads and validates grade fields from a request body, and builds the JSON snapshot kept in grade_history.
// JsonObject lets us tell "field not sent" (leave it alone) from "field sent as null" (clear it).
public static class GradeInputReader
{
    public static readonly string[] Periods = ["prelim", "midterm", "finals"];

    public static int? ReadInt(JsonObject body, string key)
    {
        try { return body[key]?.GetValue<int>(); }
        catch (Exception ex) when (ex is FormatException or InvalidOperationException) { return null; }
    }

    public static string? ReadRemarks(JsonObject body, Dictionary<string, string[]> errors)
    {
        string? text;
        try { text = body["remarks"]?.GetValue<string>(); }
        catch (Exception ex) when (ex is FormatException or InvalidOperationException)
        {
            errors["remarks"] = ["Remarks must be text."];
            return null;
        }

        text = Validation.EmptyToNull(text);
        if (text is { Length: > 500 }) errors["remarks"] = ["Remarks must be 500 characters or fewer."];
        return text;
    }

    // onlySentKeys = true: only the periods present in the body are returned (used for updates).
    // onlySentKeys = false: every period is returned, missing ones as null (used for create).
    public static Dictionary<string, decimal?> ReadScores(JsonObject body, Dictionary<string, string[]> errors, bool onlySentKeys)
    {
        var result = new Dictionary<string, decimal?>();
        foreach (var key in Periods)
        {
            if (!body.ContainsKey(key))
            {
                if (!onlySentKeys) result[key] = null;
                continue;
            }

            decimal? value;
            try { value = body[key]?.GetValue<decimal>(); }
            catch (Exception ex) when (ex is FormatException or InvalidOperationException)
            {
                errors[key] = ["Must be a number."];
                continue;
            }

            var problem = GradeRules.Validate(value);
            if (problem != null) { errors[key] = [problem]; continue; }
            result[key] = value;
        }
        return result;
    }

    // JSON stored in grade_history.old_values / new_values.
    public static string Snapshot(Grade g) => JsonSerializer.Serialize(new
    {
        prelim = Normalize(g.Prelim),
        midterm = Normalize(g.Midterm),
        finals = Normalize(g.Finals),
        remarks = g.Remarks
    });

    // 1.5 and 1.50 are the same grade but serialize differently. Force two decimals so an unchanged
    // grade never looks "changed" (the database returns 1.50, a request might send 1.5).
    private static decimal? Normalize(decimal? v) =>
        v is null ? null : decimal.Parse(v.Value.ToString("0.00", CultureInfo.InvariantCulture), CultureInfo.InvariantCulture);
}
