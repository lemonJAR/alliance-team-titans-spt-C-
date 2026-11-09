namespace SptApi.Services;

// One place for "what is a valid grade" so the rule can be tightened later without touching controllers.
// Philippine scale: 1.00 is the best, 3.00 is the lowest pass, 5.00 is a fail.
public static class GradeRules
{
    public const decimal Best = 1.00m;
    public const decimal Worst = 5.00m;
    public const decimal Passing = 3.00m;

    // Grades move in quarter steps (1.00, 1.25, 1.50 ...). This blocks values like 1.37 while still allowing
    // every grade a school might use. If your school only awards 1.00-3.00 plus 5.00, tighten IsValid below.
    private const decimal Step = 0.25m;

    public static bool IsValid(decimal grade) =>
        grade >= Best && grade <= Worst && (grade - Best) % Step == 0;

    // Returns an error message, or null when the grade is acceptable (null = "not graded yet" is acceptable).
    public static string? Validate(decimal? grade)
    {
        if (grade is null) return null;
        return IsValid(grade.Value)
            ? null
            : "Must be between 1.00 and 5.00 in steps of 0.25 (e.g. 1.25, 2.50).";
    }

    public static bool IsPassing(decimal finals) => finals <= Passing;
}