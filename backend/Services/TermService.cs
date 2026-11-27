using System.Text.RegularExpressions;
using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Mappers;
using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

public class TermService(ITermRepository terms, IUnitOfWork unitOfWork, IAuditService audit) : ITermService
{
    private static readonly Regex SchoolYearPattern = new(@"^(\d{4})-(\d{4})$", RegexOptions.Compiled);
    private const string DuplicateTerm = "That school year and semester already exists.";

    public async Task<ServiceResult> GetAllAsync()
    {
        var rows = await terms.GetAllAsync();
        return ServiceResult.Ok(rows.Select(AcademicMapper.ToDto));
    }

    public async Task<ServiceResult> CreateAsync(TermRequest request)
    {
        var errors = Validate(request.SchoolYear, request.Semester, request.StartDate, request.EndDate, requireDates: true);
        if (errors.Count > 0) return ServiceResult.Invalid(errors);

        var year = request.SchoolYear!.Trim();
        var sem = (sbyte)request.Semester!.Value;
        if (await terms.ExistsAsync(year, sem)) return ServiceResult.Invalid("school_year", DuplicateTerm);

        var term = new AcademicTerm
        {
            SchoolYear = year,
            Semester = sem,
            StartDate = request.StartDate!.Value,
            EndDate = request.EndDate!.Value,
            IsActive = request.IsActive == true
        };

        // Only one term may be active, so switching the active term and saving happen together.
        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (term.IsActive) await terms.DeactivateAllAsync();
            await terms.AddAsync(term);
        });

        await audit.LogAsync("TERM_CREATE", "AcademicTerm", term.Id,
            $"Created term {year} sem {sem}{(term.IsActive ? " (active)" : "")}");
        return ServiceResult.Created(AcademicMapper.ToDto(term));
    }

    // Any subset of fields; is_active = true makes this the active term.
    public async Task<ServiceResult> UpdateAsync(int termId, TermRequest request)
    {
        var term = await terms.GetByIdAsync(termId);
        if (term is null) return ServiceResult.NotFound("Term not found.");

        var year = request.SchoolYear?.Trim() ?? term.SchoolYear;
        var semInt = request.Semester ?? term.Semester;
        var start = request.StartDate ?? term.StartDate;
        var end = request.EndDate ?? term.EndDate;

        var errors = Validate(year, semInt, start, end, requireDates: false);
        if (errors.Count > 0) return ServiceResult.Invalid(errors);

        var sem = (sbyte)semInt;
        if (await terms.ExistsAsync(year, sem, excludeId: termId)) return ServiceResult.Invalid("school_year", DuplicateTerm);

        var activating = request.IsActive == true && !term.IsActive;
        if (request.IsActive != null) term.IsActive = request.IsActive.Value;
        term.SchoolYear = year;
        term.Semester = sem;
        term.StartDate = start;
        term.EndDate = end;

        await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (activating) await terms.DeactivateAllAsync();
            await terms.UpdateAsync(term);
        });

        await audit.LogAsync("TERM_UPDATE", "AcademicTerm", term.Id,
            $"Updated term {year} sem {sem}{(term.IsActive ? " (active)" : "")}");
        return ServiceResult.Ok(AcademicMapper.ToDto(term));
    }

    private static Dictionary<string, string[]> Validate(
        string? schoolYear, int? semester, DateOnly? start, DateOnly? end, bool requireDates)
    {
        var errors = new Dictionary<string, string[]>();

        var m = SchoolYearPattern.Match((schoolYear ?? "").Trim());
        if (!m.Success || int.Parse(m.Groups[2].Value) != int.Parse(m.Groups[1].Value) + 1)
            errors["school_year"] = ["School year must look like 2025-2026."];

        if (semester is null or < 1 or > 2) errors["semester"] = ["Semester must be 1 or 2."];

        if (requireDates && start is null) errors["start_date"] = ["Start date is required."];
        if (requireDates && end is null) errors["end_date"] = ["End date is required."];
        if (start is not null && end is not null && end <= start)
            errors["end_date"] = ["End date must be after the start date."];

        return errors;
    }
}
