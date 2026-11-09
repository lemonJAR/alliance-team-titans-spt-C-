using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;
using SptApi.Services;

namespace SptApi.Controllers;

public class SubjectRequestBody
{
    public List<int>? SubjectIds { get; set; }
}

public class SelectScheduleRequest
{
    public int? EnrollmentId { get; set; }
    public int? OfferingId { get; set; }
}

public class QueueActionRequest
{
    public List<int>? EnrollmentIds { get; set; }
    public string? Action { get; set; }            // APPROVED or REJECTED
}

// The enrollment flow:
//   1. Student requests subjects            -> PENDING
//   2. Admin approves or rejects            -> APPROVED / REJECTED
//   3. Student picks a section (offering)   -> ENROLLED   (this is where a slot is taken)
[ApiController]
[Route("api/system/enrollment")]
[Authorize]
public class EnrollmentController(SptDbContext db, AuditService audit) : ControllerBase
{
    // Passing grade on the 1.00 (best) - 5.00 scale, matching the schema comment.
    private const decimal PassingGrade = 3.00m;
    // Used when an admin hasn't set a semester load for the student's program/year/semester.
    private const int DefaultMaxUnits = 27;

    // ═════════════════════════ Student ═════════════════════════

    // GET /api/system/enrollment/request/
    // The student's prospectus for the active term: curriculum subjects for their year level and the term's semester,
    // each with the student's current request status (null = not requested).
    [HttpGet("request")]
    [Authorize(Roles = Roles.Student)]
    public async Task<IActionResult> GetProspectus()
    {
        var student = await CurrentStudent();
        if (student is null) return NotFound(new { detail = "No student profile for this account." });

        var term = await ActiveTerm();
        if (term is null || student.ProgramId is null) return Ok(Array.Empty<object>());

        var subjects = await db.Subjects
            .Include(s => s.Prerequisites)
            .Where(s => s.ProgramId == student.ProgramId
                        && s.YearLevel == student.YearLevel
                        && s.Semester == term.Semester)
            .OrderBy(s => s.Code)
            .ToListAsync();

        var mine = await db.Enrollments
            .Where(e => e.StudentId == student.Id && e.TermId == term.Id)
            .ToDictionaryAsync(e => e.SubjectId);

        return Ok(subjects.Select(s =>
        {
            mine.TryGetValue(s.Id, out var enr);
            return new
            {
                subject_id = s.Id,
                code = s.Code,
                name = s.Name,
                units = s.Units,
                prerequisites = s.Prerequisites.Select(p => p.Code),
                request_status = enr?.RequestStatus,
                enrollment_id = enr?.Id
            };
        }));
    }

    // POST /api/system/enrollment/request/   { subject_ids: [..] }
    // Each subject is checked on its own, so one bad subject doesn't block the rest.
    // Reply: { requested: ["IT101", ...], errors: ["IT103: ...", ...] }
    [HttpPost("request")]
    [Authorize(Roles = Roles.Student)]
    public async Task<IActionResult> SubmitRequest([FromBody] SubjectRequestBody req)
    {
        var student = await CurrentStudent();
        if (student is null) return NotFound(new { detail = "No student profile for this account." });
        if (student.ProgramId is null)
            return BadRequest(new { detail = "Your account has no program yet. Please contact the registrar." });

        var term = await ActiveTerm();
        if (term is null) return BadRequest(new { detail = "There is no active enrollment period." });

        var ids = (req.SubjectIds ?? []).Distinct().ToList();
        if (ids.Count == 0) return BadRequest(new { detail = "Select at least one subject." });

        var subjects = await db.Subjects.Include(s => s.Prerequisites)
            .Where(s => ids.Contains(s.Id)).ToDictionaryAsync(s => s.Id);

        var existing = await db.Enrollments.Include(e => e.Subject)
            .Where(e => e.StudentId == student.Id && e.TermId == term.Id).ToListAsync();

        var load = await db.SemesterLoads.FirstOrDefaultAsync(l =>
            l.ProgramId == student.ProgramId && l.YearLevel == student.YearLevel && l.Semester == term.Semester);
        var maxUnits = load?.MaxUnits ?? DefaultMaxUnits;

        // Units already committed this term (rejected requests don't count).
        var usedUnits = existing.Where(e => e.RequestStatus != "REJECTED").Sum(e => e.Subject.Units);

        var requested = new List<string>();
        var errors = new List<string>();

        foreach (var id in ids)
        {
            if (!subjects.TryGetValue(id, out var subject)) { errors.Add($"Subject #{id}: not found."); continue; }

            if (subject.ProgramId != student.ProgramId)
            { errors.Add($"{subject.Code}: not part of your program."); continue; }

            if (subject.YearLevel != student.YearLevel || subject.Semester != term.Semester)
            { errors.Add($"{subject.Code}: not offered for your year level this semester."); continue; }

            var prior = existing.FirstOrDefault(e => e.SubjectId == id);
            if (prior != null && prior.RequestStatus != "REJECTED")
            { errors.Add($"{subject.Code}: already {prior.RequestStatus.ToLowerInvariant()}."); continue; }

            // Every prerequisite needs a passing final grade from an earlier enrollment.
            var missing = new List<string>();
            foreach (var pre in subject.Prerequisites)
            {
                var passed = await db.Grades.AnyAsync(g =>
                    g.Enrollment.StudentId == student.Id && g.Enrollment.SubjectId == pre.Id
                    && g.Finals != null && g.Finals <= PassingGrade);
                if (!passed) missing.Add(pre.Code);
            }
            if (missing.Count > 0)
            { errors.Add($"{subject.Code}: prerequisite not passed ({string.Join(", ", missing)})."); continue; }

            if (usedUnits + subject.Units > maxUnits)
            { errors.Add($"{subject.Code}: would exceed your {maxUnits}-unit limit."); continue; }

            if (prior != null)                       // re-request after a rejection
            {
                prior.RequestStatus = "PENDING";
                prior.CreatedAt = DateTime.UtcNow;
            }
            else
            {
                db.Enrollments.Add(new Enrollment
                {
                    StudentId = student.Id,
                    SubjectId = id,
                    TermId = term.Id,
                    RequestStatus = "PENDING",
                    CreatedAt = DateTime.UtcNow
                });
            }
            usedUnits += subject.Units;
            requested.Add(subject.Code);
        }

        if (requested.Count > 0)
        {
            await db.SaveChangesAsync();
            await audit.LogAsync("ENROLLMENT_REQUEST", "Enrollment", null,
                $"Requested: {string.Join(", ", requested)}");
        }

        return Ok(new { requested, errors });
    }

    // GET /api/system/enrollment/schedule/
    // Subjects the admin approved, each with the open sections the student can pick from.
    [HttpGet("schedule")]
    [Authorize(Roles = Roles.Student)]
    public async Task<IActionResult> GetApprovedForSchedule()
    {
        var student = await CurrentStudent();
        if (student is null) return NotFound(new { detail = "No student profile for this account." });

        var term = await ActiveTerm();
        if (term is null) return Ok(Array.Empty<object>());

        var approved = await db.Enrollments.Include(e => e.Subject)
            .Where(e => e.StudentId == student.Id && e.TermId == term.Id && e.RequestStatus == "APPROVED")
            .OrderBy(e => e.Subject.Code).ToListAsync();

        var subjectIds = approved.Select(e => e.SubjectId).ToList();
        var offerings = await db.Offerings.Include(o => o.Teacher).ThenInclude(t => t!.User)
            .Where(o => o.TermId == term.Id && subjectIds.Contains(o.SubjectId))
            .OrderBy(o => o.OfferCode).ToListAsync();

        return Ok(approved.Select(e => new
        {
            id = e.Id,
            enrollment_id = e.Id,
            subject_id = e.SubjectId,
            subject_code = e.Subject.Code,
            subject_name = e.Subject.Name,
            units = e.Subject.Units,
            offerings = offerings.Where(o => o.SubjectId == e.SubjectId).Select(o => new
            {
                id = o.Id,
                offer_code = o.OfferCode,
                schedule = o.Schedule,
                room = o.Room,
                teacher_name = o.Teacher is null ? null : $"{o.Teacher.User.FirstName} {o.Teacher.User.LastName}",
                max_slots = o.MaxSlots,
                current_slots = o.CurrentSlots,
                available_slots = Math.Max(0, o.MaxSlots - o.CurrentSlots)
            })
        }));
    }

    // POST /api/system/enrollment/schedule/   { enrollment_id, offering_id }
    // Takes a slot and confirms the enrollment. The slot is claimed with a single conditional UPDATE
    // (only succeeds while current_slots < max_slots), so two students can't both grab the last seat.
    [HttpPost("schedule")]
    [Authorize(Roles = Roles.Student)]
    public async Task<IActionResult> SelectSchedule([FromBody] SelectScheduleRequest req)
    {
        var student = await CurrentStudent();
        if (student is null) return NotFound(new { detail = "No student profile for this account." });
        if (req.EnrollmentId is null || req.OfferingId is null)
            return BadRequest(new { detail = "enrollment_id and offering_id are required." });

        var term = await ActiveTerm();
        if (term is null) return BadRequest(new { detail = "There is no active enrollment period." });

        // Same answer whether it doesn't exist or belongs to another student.
        var enrollment = await db.Enrollments.FirstOrDefaultAsync(e =>
            e.Id == req.EnrollmentId && e.StudentId == student.Id);
        if (enrollment is null) return NotFound(new { detail = "Enrollment not found." });

        if (enrollment.TermId != term.Id)
            return BadRequest(new { detail = "That enrollment is not in the active term." });
        if (enrollment.RequestStatus != "APPROVED")
            return BadRequest(new { detail = enrollment.RequestStatus == "ENROLLED"
                ? "You are already enrolled in this subject."
                : "This subject has not been approved yet." });

        var offering = await db.Offerings.FirstOrDefaultAsync(o => o.Id == req.OfferingId);
        if (offering is null || offering.TermId != enrollment.TermId || offering.SubjectId != enrollment.SubjectId)
            return BadRequest(new { detail = "That section is not available for this subject." });

        await using var tx = await db.Database.BeginTransactionAsync();

        var taken = await db.Offerings
            .Where(o => o.Id == offering.Id && o.CurrentSlots < o.MaxSlots)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.CurrentSlots, o => o.CurrentSlots + 1));
        if (taken == 0)
            return Conflict(new { detail = "That section is full. Please pick another." });

        enrollment.OfferingId = offering.Id;
        enrollment.RequestStatus = "ENROLLED";
        enrollment.EnrolledAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        await audit.LogAsync("ENROLLMENT_CONFIRMED", "Enrollment", enrollment.Id,
            $"Enrolled in {offering.OfferCode}");

        return Ok(new { offer_code = offering.OfferCode, schedule = offering.Schedule, room = offering.Room });
    }

    // ═════════════════════════ Admin ═════════════════════════

    // GET /api/system/enrollment/queue/?status=PENDING   (active term)
    [HttpGet("queue")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> GetQueue([FromQuery] string? status)
    {
        var wanted = (status ?? "PENDING").Trim().ToUpperInvariant();
        if (wanted is not ("PENDING" or "APPROVED" or "REJECTED" or "ENROLLED"))
            return BadRequest(new { detail = "status must be PENDING, APPROVED, REJECTED or ENROLLED." });

        var rows = await db.Enrollments
            .Include(e => e.Student).ThenInclude(s => s.User)
            .Include(e => e.Student).ThenInclude(s => s.Program)
            .Include(e => e.Subject)
            .Where(e => e.Term.IsActive && e.RequestStatus == wanted)
            .OrderBy(e => e.Student.YearLevel).ThenBy(e => e.Subject.Code).ThenBy(e => e.CreatedAt)
            .ToListAsync();

        return Ok(rows.Select(e => new
        {
            id = e.Id,
            request_status = e.RequestStatus,
            student_id = e.StudentId,
            student_id_no = e.Student.StudentIdNo,
            student_name = e.Student.User is null ? e.Student.StudentIdNo
                : $"{e.Student.User.LastName}, {e.Student.User.FirstName}",
            year_level = e.Student.YearLevel,
            program = e.Student.Program?.Name,
            program_code = e.Student.Program?.Code,
            subject_id = e.SubjectId,
            subject_code = e.Subject.Code,
            subject_name = e.Subject.Name,
            units = e.Subject.Units,
            requested_at = e.CreatedAt
        }));
    }

    // PATCH /api/system/enrollment/queue/   { enrollment_ids: [..], action: "APPROVED" | "REJECTED" }
    // Only PENDING requests change; anything else is skipped and counted.
    [HttpPatch("queue")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> ActOnQueue([FromBody] QueueActionRequest req)
    {
        var action = (req.Action ?? "").Trim().ToUpperInvariant();
        if (action is not ("APPROVED" or "REJECTED"))
            return BadRequest(new { detail = "action must be APPROVED or REJECTED." });

        var ids = (req.EnrollmentIds ?? []).Distinct().ToList();
        if (ids.Count == 0) return BadRequest(new { detail = "Select at least one request." });

        var rows = await db.Enrollments
            .Include(e => e.Student)
            .Include(e => e.Subject)
            .Where(e => ids.Contains(e.Id)).ToListAsync();

        var pending = rows.Where(e => e.RequestStatus == "PENDING").ToList();
        foreach (var e in pending)
        {
            e.RequestStatus = action;
            if (e.Student.UserId is int uid)
            {
                db.Notifications.Add(new Notification
                {
                    UserId = uid,
                    Message = action == "APPROVED"
                        ? $"{e.Subject.Code} was approved. You can now pick a schedule."
                        : $"{e.Subject.Code} was not approved. You may request it again.",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }
        if (pending.Count > 0) await db.SaveChangesAsync();

        await audit.LogAsync(action == "APPROVED" ? "ENROLLMENT_APPROVE" : "ENROLLMENT_REJECT", "Enrollment", null,
            $"{pending.Count} request(s): {string.Join(", ", pending.Select(e => e.Id))}");

        return Ok(new { updated = pending.Count, skipped = ids.Count - pending.Count });
    }

    // ═════════════════════════ helpers ═════════════════════════

    private Task<AcademicTerm?> ActiveTerm() => db.AcademicTerms.FirstOrDefaultAsync(t => t.IsActive);

    private async Task<Student?> CurrentStudent()
    {
        var userId = User.UserId();
        return userId is null ? null : await db.Students.FirstOrDefaultAsync(s => s.UserId == userId);
    }
}