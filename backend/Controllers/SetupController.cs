using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;
using SptApi.Services;

namespace SptApi.Controllers;

public class CollegeRequest
{
    public string? Code { get; set; }
    public string? Name { get; set; }
}

public class ProgramRequest
{
    public int? College { get; set; }      // frontend sends the college id as "college"
    public string? Code { get; set; }
    public string? Name { get; set; }
}

public class SubjectRequest
{
    public int? Program { get; set; }      // program id
    public string? Code { get; set; }
    public string? Name { get; set; }
    public int? Units { get; set; }
    public int? YearLevel { get; set; }
    public int? Semester { get; set; }
    public List<int>? Prerequisites { get; set; }   // subject ids
}

public class SemesterLoadRequest
{
    public int? Program { get; set; }
    public int? YearLevel { get; set; }
    public int? Semester { get; set; }
    public int? MaxUnits { get; set; }
}

// School structure: colleges -> programs -> subjects, plus unit limits per semester.
// Anyone logged in can read it (teachers and students need the lists); only admins can change it.
[ApiController]
[Route("api/system")]
[Authorize]
public class SetupController(SptDbContext db, AuditService audit) : ControllerBase
{
    // ───────── Colleges ─────────

    // GET /api/system/colleges/
    [HttpGet("colleges")]
    public async Task<IActionResult> GetColleges()
    {
        var rows = await db.Colleges.OrderBy(c => c.Code).ToListAsync();
        return Ok(rows.Select(c => new { id = c.Id, code = c.Code, name = c.Name }));
    }

    // POST /api/system/colleges/
    [HttpPost("colleges")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> AddCollege([FromBody] CollegeRequest req)
    {
        var errors = new Dictionary<string, string[]>();
        var code = (req.Code ?? "").Trim().ToUpperInvariant();
        var name = (req.Name ?? "").Trim();

        if (code == "") errors["code"] = ["Code is required."];
        else if (code.Length > 20) errors["code"] = ["Code must be 20 characters or fewer."];
        if (name == "") errors["name"] = ["Name is required."];
        else if (name.Length > 150) errors["name"] = ["Name must be 150 characters or fewer."];
        if (errors.Count > 0) return BadRequest(errors);

        if (await db.Colleges.AnyAsync(c => c.Code == code))
            return BadRequest(new Dictionary<string, string[]> { ["code"] = ["A college with this code already exists."] });

        var college = new College { Code = code, Name = name };
        db.Colleges.Add(college);
        await db.SaveChangesAsync();

        await audit.LogAsync("COLLEGE_CREATE", "College", college.Id, $"Added college {code} - {name}");
        return StatusCode(201, new { id = college.Id, code = college.Code, name = college.Name });
    }

    // ───────── Programs ─────────

    // GET /api/system/programs/?college=
    [HttpGet("programs")]
    public async Task<IActionResult> GetPrograms([FromQuery] int? college)
    {
        var q = db.Programs.Include(p => p.College).AsQueryable();
        if (college != null) q = q.Where(p => p.CollegeId == college);

        var rows = await q.OrderBy(p => p.Code).ToListAsync();
        return Ok(rows.Select(p => new
        {
            id = p.Id,
            college = p.CollegeId,
            college_id = p.CollegeId,
            college_code = p.College.Code,
            college_name = p.College.Name,
            code = p.Code,
            name = p.Name
        }));
    }

    // POST /api/system/programs/
    [HttpPost("programs")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> AddProgram([FromBody] ProgramRequest req)
    {
        var errors = new Dictionary<string, string[]>();
        var code = (req.Code ?? "").Trim().ToUpperInvariant();
        var name = (req.Name ?? "").Trim();

        if (req.College is null) errors["college"] = ["College is required."];
        else if (!await db.Colleges.AnyAsync(c => c.Id == req.College)) errors["college"] = ["College not found."];
        if (code == "") errors["code"] = ["Code is required."];
        else if (code.Length > 20) errors["code"] = ["Code must be 20 characters or fewer."];
        if (name == "") errors["name"] = ["Name is required."];
        else if (name.Length > 150) errors["name"] = ["Name must be 150 characters or fewer."];
        if (errors.Count > 0) return BadRequest(errors);

        if (await db.Programs.AnyAsync(p => p.Code == code))
            return BadRequest(new Dictionary<string, string[]> { ["code"] = ["A program with this code already exists."] });

        var program = new AcademicProgram { CollegeId = req.College!.Value, Code = code, Name = name };
        db.Programs.Add(program);
        await db.SaveChangesAsync();

        await audit.LogAsync("PROGRAM_CREATE", "Program", program.Id, $"Added program {code} - {name}");
        return StatusCode(201, new { id = program.Id, college = program.CollegeId, code = program.Code, name = program.Name });
    }

    // ───────── Subjects ─────────

    // GET /api/system/subjects/?program=   or   ?college=
    [HttpGet("subjects")]
    public async Task<IActionResult> GetSubjects([FromQuery] int? program, [FromQuery] int? college)
    {
        var q = db.Subjects
            .Include(s => s.Program).ThenInclude(p => p.College)
            .Include(s => s.Prerequisites)
            .AsQueryable();

        if (program != null) q = q.Where(s => s.ProgramId == program);
        if (college != null) q = q.Where(s => s.Program.CollegeId == college);

        var rows = await q.OrderBy(s => s.Program.Code).ThenBy(s => s.YearLevel).ThenBy(s => s.Semester).ThenBy(s => s.Code)
            .ToListAsync();

        return Ok(rows.Select(s => new
        {
            id = s.Id,
            program = s.ProgramId,
            program_id = s.ProgramId,
            program_code = s.Program.Code,
            program_name = s.Program.Name,
            college = s.Program.CollegeId,
            code = s.Code,
            name = s.Name,
            units = s.Units,
            year_level = s.YearLevel,
            semester = s.Semester,
            prerequisites = s.Prerequisites.Select(p => p.Id)
        }));
    }

    // POST /api/system/subjects/
    [HttpPost("subjects")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> AddSubject([FromBody] SubjectRequest req)
    {
        var errors = new Dictionary<string, string[]>();
        var code = (req.Code ?? "").Trim().ToUpperInvariant();
        var name = (req.Name ?? "").Trim();

        if (req.Program is null) errors["program"] = ["Program is required."];
        else if (!await db.Programs.AnyAsync(p => p.Id == req.Program)) errors["program"] = ["Program not found."];
        if (code == "") errors["code"] = ["Code is required."];
        else if (code.Length > 20) errors["code"] = ["Code must be 20 characters or fewer."];
        if (name == "") errors["name"] = ["Name is required."];
        else if (name.Length > 150) errors["name"] = ["Name must be 150 characters or fewer."];
        if (req.Units is null or < 1 or > 12) errors["units"] = ["Units must be between 1 and 12."];
        if (req.YearLevel is null or < 1 or > 6) errors["year_level"] = ["Year level must be between 1 and 6."];
        if (req.Semester is null or < 1 or > 2) errors["semester"] = ["Semester must be 1 or 2."];
        if (errors.Count > 0) return BadRequest(errors);

        if (await db.Subjects.AnyAsync(s => s.ProgramId == req.Program && s.Code == code))
            return BadRequest(new Dictionary<string, string[]> { ["code"] = ["This program already has a subject with that code."] });

        // Prerequisites must exist and belong to the same program.
        var prereqIds = (req.Prerequisites ?? []).Distinct().ToList();
        var prereqs = await db.Subjects.Where(s => prereqIds.Contains(s.Id)).ToListAsync();
        if (prereqs.Count != prereqIds.Count)
            return BadRequest(new Dictionary<string, string[]> { ["prerequisites"] = ["One or more prerequisites were not found."] });
        if (prereqs.Any(p => p.ProgramId != req.Program))
            return BadRequest(new Dictionary<string, string[]> { ["prerequisites"] = ["Prerequisites must belong to the same program."] });

        var subject = new Subject
        {
            ProgramId = req.Program!.Value,
            Code = code,
            Name = name,
            Units = req.Units!.Value,
            YearLevel = (sbyte)req.YearLevel!.Value,
            Semester = (sbyte)req.Semester!.Value
        };
        foreach (var p in prereqs) subject.Prerequisites.Add(p);

        db.Subjects.Add(subject);
        await db.SaveChangesAsync();

        await audit.LogAsync("SUBJECT_CREATE", "Subject", subject.Id, $"Added subject {code} - {name}");
        return StatusCode(201, new { id = subject.Id, code = subject.Code, name = subject.Name });
    }

    // ───────── Semester loads ─────────

    // GET /api/system/semester-loads/?program=
    // Each row also lists the subjects the program offers for that year + semester.
    [HttpGet("semester-loads")]
    public async Task<IActionResult> GetSemesterLoads([FromQuery] int? program)
    {
        var q = db.SemesterLoads.Include(l => l.Program).AsQueryable();
        if (program != null) q = q.Where(l => l.ProgramId == program);
        var loads = await q.OrderBy(l => l.Program.Code).ThenBy(l => l.YearLevel).ThenBy(l => l.Semester).ToListAsync();

        var programIds = loads.Select(l => l.ProgramId).Distinct().ToList();
        var subjects = await db.Subjects.Where(s => programIds.Contains(s.ProgramId)).ToListAsync();

        return Ok(loads.Select(l => new
        {
            id = l.Id,
            program = l.ProgramId,
            program_id = l.ProgramId,
            program_code = l.Program.Code,
            program_name = l.Program.Name,
            year_level = l.YearLevel,
            semester = l.Semester,
            max_units = l.MaxUnits,
            subjects = subjects
                .Where(s => s.ProgramId == l.ProgramId && s.YearLevel == l.YearLevel && s.Semester == l.Semester)
                .OrderBy(s => s.Code)
                .Select(s => new { id = s.Id, code = s.Code, name = s.Name, units = s.Units })
        }));
    }

    // POST /api/system/semester-loads/   (creates, or updates if that program/year/semester already has one)
    [HttpPost("semester-loads")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> SetSemesterLoad([FromBody] SemesterLoadRequest req)
    {
        var errors = new Dictionary<string, string[]>();

        if (req.Program is null) errors["program"] = ["Program is required."];
        else if (!await db.Programs.AnyAsync(p => p.Id == req.Program)) errors["program"] = ["Program not found."];
        if (req.YearLevel is null or < 1 or > 6) errors["year_level"] = ["Year level must be between 1 and 6."];
        if (req.Semester is null or < 1 or > 2) errors["semester"] = ["Semester must be 1 or 2."];
        if (req.MaxUnits is null or < 1 or > 40) errors["max_units"] = ["Max units must be between 1 and 40."];
        if (errors.Count > 0) return BadRequest(errors);

        var year = (sbyte)req.YearLevel!.Value;
        var sem = (sbyte)req.Semester!.Value;

        var load = await db.SemesterLoads.FirstOrDefaultAsync(l =>
            l.ProgramId == req.Program && l.YearLevel == year && l.Semester == sem);

        var created = load is null;
        if (created)
        {
            load = new SemesterLoad { ProgramId = req.Program!.Value, YearLevel = year, Semester = sem };
            db.SemesterLoads.Add(load);
        }
        load!.MaxUnits = req.MaxUnits!.Value;
        await db.SaveChangesAsync();

        await audit.LogAsync(created ? "SEMESTER_LOAD_CREATE" : "SEMESTER_LOAD_UPDATE", "SemesterLoad", load.Id,
            $"Program {load.ProgramId}, year {year}, sem {sem}: max {load.MaxUnits} units");
        return StatusCode(created ? 201 : 200, new { id = load.Id, max_units = load.MaxUnits });
    }
}