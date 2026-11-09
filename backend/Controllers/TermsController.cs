using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;
using SptApi.Services;

namespace SptApi.Controllers;

public class TermRequest
{
    public string? SchoolYear { get; set; }     // e.g. 2025-2026
    public int? Semester { get; set; }          // 1 or 2
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool? IsActive { get; set; }
}

// Academic terms. Exactly one term can be active at a time; students enroll into the active one.
[ApiController]
[Route("api/system/terms")]
[Authorize]
public class TermsController(SptDbContext db, AuditService audit) : ControllerBase
{
    private static readonly Regex SchoolYearPattern = new(@"^(\d{4})-(\d{4})$", RegexOptions.Compiled);

    private static object ToDto(AcademicTerm t) => new
    {
        id = t.Id,
        school_year = t.SchoolYear,
        semester = t.Semester,
        start_date = t.StartDate,
        end_date = t.EndDate,
        is_active = t.IsActive
    };

    // GET /api/system/terms/   newest first
    [HttpGet]
    public async Task<IActionResult> GetTerms()
    {
        var rows = await db.AcademicTerms
            .OrderByDescending(t => t.SchoolYear).ThenByDescending(t => t.Semester)
            .ToListAsync();
        return Ok(rows.Select(ToDto));
    }

    // POST /api/system/terms/
    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> CreateTerm([FromBody] TermRequest req)
    {
        var errors = Validate(req.SchoolYear, req.Semester, req.StartDate, req.EndDate, requireAll: true);
        if (errors.Count > 0) return BadRequest(errors);

        var year = req.SchoolYear!.Trim();
        var sem = (sbyte)req.Semester!.Value;

        if (await db.AcademicTerms.AnyAsync(t => t.SchoolYear == year && t.Semester == sem))
            return BadRequest(new Dictionary<string, string[]> { ["school_year"] = ["That school year and semester already exists."] });

        await using var tx = await db.Database.BeginTransactionAsync();

        if (req.IsActive == true) await DeactivateAll();

        var term = new AcademicTerm
        {
            SchoolYear = year,
            Semester = sem,
            StartDate = req.StartDate!.Value,
            EndDate = req.EndDate!.Value,
            IsActive = req.IsActive == true
        };
        db.AcademicTerms.Add(term);
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        await audit.LogAsync("TERM_CREATE", "AcademicTerm", term.Id,
            $"Created term {year} sem {sem}{(term.IsActive ? " (active)" : "")}");
        return StatusCode(201, ToDto(term));
    }

    // PATCH /api/system/terms/{id}/   any subset of the fields; setting is_active=true switches the active term
    [HttpPatch("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> UpdateTerm(int id, [FromBody] TermRequest req)
    {
        var term = await db.AcademicTerms.FindAsync(id);
        if (term is null) return NotFound(new { detail = "Term not found." });

        var year = req.SchoolYear?.Trim() ?? term.SchoolYear;
        var semInt = req.Semester ?? term.Semester;
        var start = req.StartDate ?? term.StartDate;
        var end = req.EndDate ?? term.EndDate;

        var errors = Validate(year, semInt, start, end, requireAll: false);
        if (errors.Count > 0) return BadRequest(errors);

        var sem = (sbyte)semInt;
        if (await db.AcademicTerms.AnyAsync(t => t.Id != id && t.SchoolYear == year && t.Semester == sem))
            return BadRequest(new Dictionary<string, string[]> { ["school_year"] = ["That school year and semester already exists."] });

        await using var tx = await db.Database.BeginTransactionAsync();

        if (req.IsActive == true && !term.IsActive) await DeactivateAll();
        if (req.IsActive != null) term.IsActive = req.IsActive.Value;

        term.SchoolYear = year;
        term.Semester = sem;
        term.StartDate = start;
        term.EndDate = end;
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        await audit.LogAsync("TERM_UPDATE", "AcademicTerm", term.Id,
            $"Updated term {year} sem {sem}{(term.IsActive ? " (active)" : "")}");
        return Ok(ToDto(term));
    }

    // ───────── helpers ─────────

    private Task<int> DeactivateAll() =>
        db.AcademicTerms.Where(t => t.IsActive).ExecuteUpdateAsync(s => s.SetProperty(t => t.IsActive, false));

    private static Dictionary<string, string[]> Validate(
        string? schoolYear, int? semester, DateOnly? start, DateOnly? end, bool requireAll)
    {
        var errors = new Dictionary<string, string[]>();

        var m = SchoolYearPattern.Match((schoolYear ?? "").Trim());
        if (!m.Success || int.Parse(m.Groups[2].Value) != int.Parse(m.Groups[1].Value) + 1)
            errors["school_year"] = ["School year must look like 2025-2026."];

        if (semester is null or < 1 or > 2) errors["semester"] = ["Semester must be 1 or 2."];

        if (requireAll && start is null) errors["start_date"] = ["Start date is required."];
        if (requireAll && end is null) errors["end_date"] = ["End date is required."];
        if (start is not null && end is not null && end <= start)
            errors["end_date"] = ["End date must be after the start date."];

        return errors;
    }
}