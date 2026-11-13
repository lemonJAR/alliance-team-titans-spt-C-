using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;
using SptApi.Services;

namespace SptApi.Controllers;

public class OfferingRequest
{
    public int? Term { get; set; }
    public int? Subject { get; set; }
    public int? Teacher { get; set; }       // optional: a section can be created before a teacher is picked
    public string? Schedule { get; set; }
    public string? Room { get; set; }
    public int? MaxSlots { get; set; }
}

// Class offerings (sections): a subject taught in a term, with a schedule, room, teacher and slot count.
[ApiController]
[Route("api/system")]
[Authorize]
public class OfferingsController(SptDbContext db, AuditService audit) : ControllerBase
{
    private IQueryable<Offering> WithDetails() => db.Offerings
        .Include(o => o.Term)
        .Include(o => o.Subject).ThenInclude(s => s.Program)
        .Include(o => o.Teacher).ThenInclude(t => t!.User);

    private static object ToDto(Offering o) => new
    {
        id = o.Id,
        offer_code = o.OfferCode,
        term = o.TermId,
        term_id = o.TermId,
        school_year = o.Term.SchoolYear,
        semester = o.Term.Semester,
        subject = o.SubjectId,
        subject_id = o.SubjectId,
        subject_code = o.Subject.Code,
        subject_name = o.Subject.Name,
        units = o.Subject.Units,
        program = o.Subject.ProgramId,
        program_code = o.Subject.Program.Code,
        year_level = o.Subject.YearLevel,
        teacher = o.TeacherId,
        teacher_name = o.Teacher is null ? null
            : $"{o.Teacher.User.FirstName} {o.Teacher.User.LastName}",
        schedule = o.Schedule,
        room = o.Room,
        max_slots = o.MaxSlots,
        current_slots = o.CurrentSlots,
        is_full = o.CurrentSlots >= o.MaxSlots
    };

    // ───────── Admin / general ─────────

    // GET /api/system/offerings/?term=&program=&year_level=&semester=
    // "semester" and "year_level" here describe the SUBJECT's place in the curriculum, not the term.
    [HttpGet("offerings")]
    public async Task<IActionResult> GetOfferings(
        [FromQuery] int? term, [FromQuery] int? program,
        [FromQuery(Name = "year_level")] int? yearLevel, [FromQuery] int? semester)
    {
        var q = WithDetails();
        if (term != null) q = q.Where(o => o.TermId == term);
        if (program != null) q = q.Where(o => o.Subject.ProgramId == program);
        if (yearLevel != null) q = q.Where(o => o.Subject.YearLevel == yearLevel);
        if (semester != null) q = q.Where(o => o.Subject.Semester == semester);

        var rows = await q.OrderBy(o => o.Subject.Code).ThenBy(o => o.OfferCode).ToListAsync();
        return Ok(rows.Select(ToDto));
    }

    // POST /api/system/offerings/
    [HttpPost("offerings")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> CreateOffering([FromBody] OfferingRequest req)
    {
        var errors = new Dictionary<string, string[]>();
        var schedule = (req.Schedule ?? "").Trim();
        var room = string.IsNullOrWhiteSpace(req.Room) ? null : req.Room.Trim();

        var term = req.Term is null ? null : await db.AcademicTerms.FindAsync(req.Term);
        var subject = req.Subject is null ? null : await db.Subjects.FindAsync(req.Subject);

        if (term is null) errors["term"] = ["Term not found."];
        if (subject is null) errors["subject"] = ["Subject not found."];
        if (schedule == "") errors["schedule"] = ["Schedule is required."];
        else if (schedule.Length > 120) errors["schedule"] = ["Schedule must be 120 characters or fewer."];
        if (room is { Length: > 60 }) errors["room"] = ["Room must be 60 characters or fewer."];
        if (req.MaxSlots is null or < 1 or > 200) errors["max_slots"] = ["Slots must be between 1 and 200."];

        if (req.Teacher is int tid)
        {
            var teacher = await db.Teachers.Include(t => t.User).FirstOrDefaultAsync(t => t.Id == tid);
            if (teacher is null) errors["teacher"] = ["Teacher not found."];
            else if (teacher.User.IsActive == false) errors["teacher"] = ["That teacher's account is not active."];
        }
        if (errors.Count > 0) return BadRequest(errors);

        // Code looks like IT101-1-01 (subject, term id, section number). Skip any number already taken.
        var n = await db.Offerings.CountAsync(o => o.TermId == term!.Id && o.SubjectId == subject!.Id) + 1;
        string code;
        do { code = $"{subject!.Code}-{term!.Id}-{n++:D2}"; }
        while (await db.Offerings.AnyAsync(o => o.OfferCode == code));

        var offering = new Offering
        {
            TermId = term!.Id,
            SubjectId = subject!.Id,
            TeacherId = req.Teacher,
            OfferCode = code,
            Schedule = schedule,
            Room = room,
            MaxSlots = req.MaxSlots!.Value,
            CurrentSlots = 0
        };
        db.Offerings.Add(offering);
        await db.SaveChangesAsync();

        await audit.LogAsync("OFFERING_CREATE", "Offering", offering.Id,
            $"Created {code}: {schedule}, {offering.MaxSlots} slots");

        var created = await WithDetails().FirstAsync(o => o.Id == offering.Id);
        return StatusCode(201, ToDto(created));
    }

    // ───────── Teacher ─────────

    // GET /api/system/teacher/offerings/?term=   defaults to the active term
    [HttpGet("teacher/offerings")]
    [Authorize(Roles = Roles.Professor)]
    public async Task<IActionResult> GetMyOfferings([FromQuery] int? term)
    {
        var teacher = await CurrentTeacher();
        if (teacher is null) return NotFound(new { detail = "No teacher profile for this account." });

        var q = WithDetails().Where(o => o.TeacherId == teacher.Id);
        q = term != null ? q.Where(o => o.TermId == term) : q.Where(o => o.Term.IsActive);

        var rows = await q.OrderBy(o => o.Subject.Code).ThenBy(o => o.OfferCode).ToListAsync();
        return Ok(rows.Select(ToDto));
    }

    // GET /api/system/teacher/offerings/{id}/enrollments/   students enrolled in one of my sections
    [HttpGet("teacher/offerings/{id:int}/enrollments")]
    [Authorize(Roles = Roles.Professor)]
    public async Task<IActionResult> GetMyOfferingEnrollments(int id)
    {
        var teacher = await CurrentTeacher();
        if (teacher is null) return NotFound(new { detail = "No teacher profile for this account." });

        // Same answer for "doesn't exist" and "belongs to someone else".
        var owns = await db.Offerings.AnyAsync(o => o.Id == id && o.TeacherId == teacher.Id);
        if (!owns) return NotFound(new { detail = "Offering not found." });

        var rows = await db.Enrollments
            .Include(e => e.Student).ThenInclude(s => s.User)
            .Where(e => e.OfferingId == id && e.RequestStatus == "ENROLLED")
            .OrderBy(e => e.Student.User!.LastName).ThenBy(e => e.Student.User!.FirstName)
            .ToListAsync();

        return Ok(rows.Select(e => new
        {
            id = e.Id,                              // enrollment id (grades attach to this)
            student_id = e.StudentId,               // students.id
            student_id_no = e.Student.StudentIdNo,
            student_name = e.Student.User is null ? e.Student.StudentIdNo
                : $"{e.Student.User.LastName}, {e.Student.User.FirstName}",
            subject_id = e.SubjectId
        }));
    }

    private async Task<Teacher?> CurrentTeacher()
    {
        var userId = User.UserId();
        return userId is null ? null : await db.Teachers.FirstOrDefaultAsync(t => t.UserId == userId);
    }
}