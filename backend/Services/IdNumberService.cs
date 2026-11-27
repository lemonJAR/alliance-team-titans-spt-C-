using System.Globalization;
using SptApi.Repositories;

namespace SptApi.Services;

// Hands out ID numbers automatically so nobody has to type (or invent) them.
//   Students:  {current year}-{4-digit sequence}   e.g. 2026-0001, 2026-0002 ...   (restarts each year)
//   Employees: EMP-{4-digit sequence}              e.g. EMP-0001, EMP-0002 ...
// The next number is one more than the highest already used, so gaps left by removed records are never reused.
public class IdNumberService(IStudentRepository students, ITeacherRepository teachers) : IIdNumberService
{
    public const string EmployeePrefix = "EMP-";

    public async Task<string> NextStudentIdAsync()
    {
        var prefix = $"{DateTime.UtcNow.Year}-";
        var existing = await students.GetStudentIdNumbersStartingWithAsync(prefix);
        return $"{prefix}{NextSequence(existing, prefix):D4}";
    }

    public async Task<string> NextEmployeeIdAsync()
    {
        var existing = await teachers.GetEmployeeIdsStartingWithAsync(EmployeePrefix);
        return $"{EmployeePrefix}{NextSequence(existing, EmployeePrefix):D4}";
    }

    // Highest numeric suffix + 1. IDs whose suffix isn't a number (hand-typed legacy values) are ignored.
    private static int NextSequence(IEnumerable<string> ids, string prefix)
    {
        var max = 0;
        foreach (var id in ids)
        {
            if (int.TryParse(id.AsSpan(prefix.Length), NumberStyles.None, CultureInfo.InvariantCulture, out var n) && n > max)
                max = n;
        }
        return max + 1;
    }
}
