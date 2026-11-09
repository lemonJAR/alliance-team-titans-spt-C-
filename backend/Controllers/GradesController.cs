using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SptApi.Data;
using SptApi.Models;
using SptApi.Services;

namespace SptApi.Controllers;

// Grades hang off an enrollment (one grade record per enrollment). Every change writes a grade_history row
// so students and admins can see who changed what and when.
//
// Who can do what:
//   Student    - read own grades, own timeline, export own CSV
//   Professor  - enter / edit / delete grades for students in THEIR OWN sections
//   Admin      - read everything, edit and delete any grade (grade override)
[ApiController]
[Route("api/system/grades")]
[Authorize]
public class GradesController(SptDbContext db, AuditService audit) : ControllerBase
{
    private const string StaffRoles = Roles.Professor + "," + Roles.Admin;

    // ═════════════════════════ Reading ═════════════════════════

    // GET /api/system/grades/mine/
    [HttpGet("mine")]
    [Authorize(Roles = Roles.Student)]
    public async Task<IActionResult> GetMine()
    {
        var student = await CurrentStudent();
        if (student is null) return NotFound(new { detail = "No student profile for this account." });

        var rows = await WithDetails()
            .Where(g => g.Enrollment.StudentId == student.Id)
            .OrderByDescending(g => g.Enrollment.Term.SchoolYear)
            .ThenByDescending(g => g.Enrollment.Term.Semester)
            .ThenBy(g => g.Enrollment.Subject.Code)
            .ToListAsync();

        return Ok(rows.Select(ToDto));
    }

    // GET /api/system/grades/?offering=&student=&term=&subject=&period=prelim|midterm|finals
    // Professors only ever see grades from their own sections, whatever they ask for.
    [HttpGet]
    [Authorize(Roles = StaffRoles)]
    public async Task<IActionResult> GetGrades(
        [FromQuery] int? offering, [FromQuery] int? student, [FromQuery] int? term,
        [FromQuery] int? subject, [FromQuery] string? period)
    {
        var q = WithDetails();

        if (IsProfessor)
        {
            var teacher = await CurrentTeacher();
            if (teacher is null) return NotFound(new { detail = "No teacher profile for this account." });
            q = q.Where(g => g.Enrollment.Offering != null && g.Enrollment.Offering.TeacherId == teacher.Id);
        }

        if (offering != null) q = q.Where(g => g.Enrollment.OfferingId == offering);
        if (student != null) q = q.Where(g => g.Enrollment.StudentId == student);
        if (term != null) q = q.Where(g => g.Enrollment.TermId == term);
        if (subject != null) q = q.Where(g => g.Enrollment.SubjectId == subject);

        switch ((period ?? "").Trim().ToLowerInvariant())
        {
            case "prelim": q = q.Where(g => g.Prelim != null); break;
            case "midterm": q = q.Where(g => g.Midterm != null); break;
            case "finals": q = q.Where(g => g.Finals != null); break;
        }

        var rows = await q
            .OrderBy(g => g.Enrollment.Student.StudentIdNo)
            .ThenBy(g => g.Enrollment.Subject.Code)
            .Take(2000)
            .ToListAsync();

        return Ok(rows.Select(ToDto));
    }

    // GET /api/system/grades/{id}/history/
    [HttpGet("{id:int}/history")]
    public async Task<IActionResult> GetHistory(int id)
    {
        var grade = await WithDetails().FirstOrDefaultAsync(g => g.Id == id);

        if (grade is null)
        {
            // A deleted grade has no owner to check, so only admins may still read its trail.
            if (!IsAdmin) return NotFound(new { detail = "Grade not found." });
        }
        else if (!await CanRead(grade))
        {
            return NotFound(new { detail = "Grade not found." });
        }

        var history = await db.GradeHistories.Where(h => h.GradeId == id)
            .OrderByDescending(h => h.ChangedAt).ThenByDescending(h => h.Id).ToListAsync();
        return Ok(await ToHistoryDtos(history));
    }

    // GET /api/system/grades/timeline/?student=
    // Student: own history. Professor: history of their own sections. Admin: everything (optionally one student).
    [HttpGet("timeline")]
    public async Task<IActionResult> GetTimeline([FromQuery] int? student)
    {
        var grades = db.Grades.AsQueryable();

        if (IsAdmin)
        {
            if (student != null) grades = grades.Where(g => g.Enrollment.StudentId == student);
        }
        else if (IsProfessor)
        {
            var teacher = await CurrentTeacher();
            if (teacher is null) return NotFound(new { detail = "No teacher profile for this account." });
            grades = grades.Where(g => g.Enrollment.Offering != null && g.Enrollment.Offering.TeacherId == teacher.Id);
            if (student != null) grades = grades.Where(g => g.Enrollment.StudentId == student);
        }
        else
        {
            var me = await CurrentStudent();
            if (me is null) return NotFound(new { detail = "No student profile for this account." });
            grades = grades.Where(g => g.Enrollment.StudentId == me.Id);
        }

        var gradeIds = grades.Select(g => g.Id);
        var history = await db.GradeHistories.Where(h => gradeIds.Contains(h.GradeId))
            .OrderByDescending(h => h.ChangedAt).ThenByDescending(h => h.Id)
            .Take(200).ToListAsync();

        return Ok(await ToHistoryDtos(history));
    }

    // GET /api/system/grades/export/   the student's own grades as a CSV file
    [HttpGet("export")]
    [Authorize(Roles = Roles.Student)]
    public async Task<IActionResult> ExportMine()
    {
        var student = await CurrentStudent();
        if (student is null) return NotFound(new { detail = "No student profile for this account." });

        var rows = await WithDetails()
            .Where(g => g.Enrollment.StudentId == student.Id)
            .OrderBy(g => g.Enrollment.Term.SchoolYear).ThenBy(g => g.Enrollment.Term.Semester)
            .ThenBy(g => g.Enrollment.Subject.Code)
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("School Year,Semester,Subject Code,Subject Name,Units,Prelim,Midterm,Finals,Remarks");
        foreach (var g in rows)
        {
            var e = g.Enrollment;
            sb.AppendLine(string.Join(",", new[]
            {
                Csv(e.Term.SchoolYear), Csv(e.Term.Semester.ToString()),
                Csv(e.Subject.Code), Csv(e.Subject.Name), Csv(e.Subject.Units.ToString()),
                Csv(Fmt(g.Prelim)), Csv(Fmt(g.Midterm)), Csv(Fmt(g.Finals)), Csv(g.Remarks ?? "")
            }));
        }

        // UTF-8 with a BOM so Excel opens accented names correctly.
        var bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
        return File(bytes, "text/csv", "grades.csv");
    }

    // ═════════════════════════ Writing ═════════════════════════

    // POST /api/system/grades/   { student, subject, offering, term, prelim, midterm, finals, remarks }
    // "student" is students.id. The grade is attached to that student's enrollment for the subject + term.
    [HttpPost]
    [Authorize(Roles = StaffRoles)]
    public async Task<IActionResult> CreateGrade([FromBody] JsonObject body)
    {
        var errors = new Dictionary<string, string[]>();

        var studentId = ReadInt(body, "student");
        var subjectId = ReadInt(body, "subject");
        var termId = ReadInt(body, "term");
        var offeringId = ReadInt(body, "offering");
        if (studentId is null) errors["student"] = ["Student is required."];
        if (subjectId is null) errors["subject"] = ["Subject is required."];
        if (termId is null) errors["term"] = ["Term is required."];

        var gradeValues = ReadGradeValues(body, errors, requireKeys: false);
        var remarks = ReadRemarks(body, errors);
        if (errors.Count > 0) return BadRequest(errors);

        if (gradeValues.All(v => v.Value is null))
            return BadRequest(new { detail = "Enter at least one grade." });

        var enrollment = await db.Enrollments
            .Include(e => e.Offering)
            .Include(e => e.Subject)
            .Include(e => e.Student).ThenInclude(s => s.User)
            .FirstOrDefaultAsync(e => e.StudentId == studentId && e.SubjectId == subjectId && e.TermId == termId);

        if (enrollment is null || enrollment.RequestStatus != "ENROLLED")
            return BadRequest(new { detail = "That student is not enrolled in this subject for this term." });
        if (offeringId != null && enrollment.OfferingId != offeringId)
            return BadRequest(new { detail = "That student is enrolled in a different section." });
        if (!await CanManage(enrollment))
            return NotFound(new { detail = "Enrollment not found." });     // don't reveal other teachers' classes

        if (await db.Grades.AnyAsync(g => g.EnrollmentId == enrollment.Id))
            return Conflict(new { detail = "A grade already exists for this student. Edit it instead." });

        await using var tx = await db.Database.BeginTransactionAsync();

        var grade = new Grade
        {
            EnrollmentId = enrollment.Id,
            Prelim = gradeValues["prelim"],
            Midterm = gradeValues["midterm"],
            Finals = gradeValues["finals"],
            Remarks = remarks,
            EnteredBy = User.UserId()!.Value
        };
        db.Grades.Add(grade);
        await db.SaveChangesAsync();

        db.GradeHistories.Add(History(grade.Id, "CREATE", null, Snapshot(grade)));
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        await audit.LogAsync("GRADE_CREATE", "Grade", grade.Id,
            $"{enrollment.Student.StudentIdNo} / {enrollment.Subject.Code}: {Snapshot(grade)}");
        await Notify(enrollment.Student, $"A grade was posted for {enrollment.Subject.Code}.");

        var created = await WithDetails().FirstAsync(g => g.Id == grade.Id);
        return StatusCode(201, ToDto(created));
    }

    // PATCH /api/system/grades/{id}/
    // Only the fields that are sent change; sending a field as null clears it.
    // Extra keys (student, subject, offering, term) are accepted and ignored.
    [HttpPatch("{id:int}")]
    [Authorize(Roles = StaffRoles)]
    public async Task<IActionResult> UpdateGrade(int id, [FromBody] JsonObject body)
    {
        var grade = await WithDetails().FirstOrDefaultAsync(g => g.Id == id);
        if (grade is null || !await CanManage(grade.Enrollment))
            return NotFound(new { detail = "Grade not found." });

        var errors = new Dictionary<string, string[]>();
        var incoming = ReadGradeValues(body, errors, requireKeys: true);
        var hasRemarks = body.ContainsKey("remarks");
        var remarks = hasRemarks ? ReadRemarks(body, errors) : grade.Remarks;
        if (errors.Count > 0) return BadRequest(errors);

        var before = Snapshot(grade);

        if (incoming.ContainsKey("prelim")) grade.Prelim = incoming["prelim"];
        if (incoming.ContainsKey("midterm")) grade.Midterm = incoming["midterm"];
        if (incoming.ContainsKey("finals")) grade.Finals = incoming["finals"];
        if (hasRemarks) grade.Remarks = remarks;

        if (grade.Prelim is null && grade.Midterm is null && grade.Finals is null)
            return BadRequest(new { detail = "A grade needs at least one score. Delete the entry to remove it." });

        var after = Snapshot(grade);
        if (before == after) return Ok(ToDto(grade));      // nothing actually changed

        await using var tx = await db.Database.BeginTransactionAsync();
        grade.EnteredBy = User.UserId()!.Value;            // last editor
        db.GradeHistories.Add(History(grade.Id, "UPDATE", before, after));
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        await audit.LogAsync("GRADE_UPDATE", "Grade", grade.Id,
            $"{grade.Enrollment.Student.StudentIdNo} / {grade.Enrollment.Subject.Code}: {before} -> {after}");
        await Notify(grade.Enrollment.Student, $"Your grade for {grade.Enrollment.Subject.Code} was updated.");

        return Ok(ToDto(grade));
    }

    // DELETE /api/system/grades/{id}/
    // The history row stays (grade_history has no foreign key to grades), so the deletion is still traceable.
    [HttpDelete("{id:int}")]
    [Authorize(Roles = StaffRoles)]
    public async Task<IActionResult> DeleteGrade(int id)
    {
        var grade = await WithDetails().FirstOrDefaultAsync(g => g.Id == id);
        if (grade is null || !await CanManage(grade.Enrollment))
            return NotFound(new { detail = "Grade not found." });

        var before = Snapshot(grade);
        var label = $"{grade.Enrollment.Student.StudentIdNo} / {grade.Enrollment.Subject.Code}";

        await using var tx = await db.Database.BeginTransactionAsync();
        db.GradeHistories.Add(History(grade.Id, "DELETE", before, null));
        db.Grades.Remove(grade);
        await db.SaveChangesAsync();
        await tx.CommitAsync();

        await audit.LogAsync("GRADE_DELETE", "Grade", id, $"{label}: {before}");
        return Ok(new { detail = "Grade deleted." });
    }

    // ═════════════════════════ helpers ═════════════════════════

    private bool IsAdmin => User.UserRole() == Roles.Admin;
    private bool IsProfessor => User.UserRole() == Roles.Professor;

    private IQueryable<Grade> WithDetails() => db.Grades
        .Include(g => g.Enrollment).ThenInclude(e => e.Student).ThenInclude(s => s.User)
        .Include(g => g.Enrollment).ThenInclude(e => e.Subject)
        .Include(g => g.Enrollment).ThenInclude(e => e.Term)
        .Include(g => g.Enrollment).ThenInclude(e => e.Offering);

    private async Task<Teacher?> CurrentTeacher()
    {
        var userId = User.UserId();
        return userId is null ? null : await db.Teachers.FirstOrDefaultAsync(t => t.UserId == userId);
    }

    private async Task<Student?> CurrentStudent()
    {
        var userId = User.UserId();
        return userId is null ? null : await db.Students.FirstOrDefaultAsync(s => s.UserId == userId);
    }

    // Admins can change any grade; a professor only grades students in a section assigned to them.
    private async Task<bool> CanManage(Enrollment enrollment)
    {
        if (IsAdmin) return true;
        if (!IsProfessor) return false;
        var teacher = await CurrentTeacher();
        return teacher != null && enrollment.Offering?.TeacherId == teacher.Id;
    }

    private async Task<bool> CanRead(Grade grade)
    {
        if (await CanManage(grade.Enrollment)) return true;
        if (User.UserRole() != Roles.Student) return false;
        var me = await CurrentStudent();
        return me != null && grade.Enrollment.StudentId == me.Id;
    }

    private async Task Notify(Student student, string message)
    {
        if (student.UserId is not int uid) return;
        db.Notifications.Add(new Notification { UserId = uid, Message = message, IsRead = false, CreatedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();
    }

    private GradeHistory History(int gradeId, string action, string? oldValues, string? newValues) => new()
    {
        GradeId = gradeId,
        ChangedBy = User.UserId()!.Value,
        Action = action,
        OldValues = oldValues,
        NewValues = newValues,
        ChangedAt = DateTime.UtcNow
    };

    // JSON stored in grade_history.old_values / new_values.
    private static string Snapshot(Grade g) => JsonSerializer.Serialize(new
    {
        prelim = Norm(g.Prelim),
        midterm = Norm(g.Midterm),
        finals = Norm(g.Finals),
        remarks = g.Remarks
    });

    // 1.5 and 1.50 are the same grade, but serialize differently. Force two decimals so an unchanged
    // grade never looks "changed" (the database returns 1.50, a request might send 1.5).
    private static decimal? Norm(decimal? v) =>
        v is null ? null : decimal.Parse(v.Value.ToString("0.00", CultureInfo.InvariantCulture), CultureInfo.InvariantCulture);

    private static object ToDto(Grade g)
    {
        var e = g.Enrollment;
        var u = e.Student.User;
        return new
        {
            id = g.Id,
            enrollment_id = g.EnrollmentId,
            student = e.StudentId,                          // students.id
            student_id_no = e.Student.StudentIdNo,
            student_name = u is null ? e.Student.StudentIdNo : $"{u.LastName}, {u.FirstName}",
            subject = e.SubjectId,
            subject_id = e.SubjectId,
            subject_code = e.Subject.Code,
            subject_name = e.Subject.Name,
            units = e.Subject.Units,
            year_level = e.Subject.YearLevel,
            semester = e.Subject.Semester,
            term = e.TermId,
            term_label = $"{e.Term.SchoolYear} - Sem {e.Term.Semester}",
            offering = e.OfferingId,
            offer_code = e.Offering?.OfferCode,
            prelim = g.Prelim,
            midterm = g.Midterm,
            finals = g.Finals,
            remarks = g.Remarks,
            entered_by = g.EnteredBy,
            created_at = g.CreatedAt,
            updated_at = g.UpdatedAt
        };
    }

    private async Task<List<object>> ToHistoryDtos(List<GradeHistory> history)
    {
        var userIds = history.Select(h => h.ChangedBy).Distinct().ToList();
        var names = await db.Users.Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}");

        return history.Select(h =>
        {
            var oldValues = ParseJson(h.OldValues);
            var newValues = ParseJson(h.NewValues);
            return (object)new
            {
                id = h.Id,
                grade = h.GradeId,
                action = h.Action,
                changed_by = h.ChangedBy,
                changed_by_name = names.GetValueOrDefault(h.ChangedBy),
                old_values = oldValues,
                new_values = newValues,
                current = newValues ?? oldValues,          // what the student page shows as "remarks"
                created_at = h.ChangedAt
            };
        }).ToList();
    }

    private static JsonElement? ParseJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return JsonSerializer.Deserialize<JsonElement>(json); }
        catch (JsonException) { return null; }
    }

    // ───── request body readers (JsonObject lets us tell "field missing" from "field set to null") ─────

    private static int? ReadInt(JsonObject body, string key)
    {
        try { return body[key]?.GetValue<int>(); }
        catch (Exception ex) when (ex is FormatException or InvalidOperationException) { return null; }
    }

    private static string? ReadRemarks(JsonObject body, Dictionary<string, string[]> errors)
    {
        string? text;
        try { text = body["remarks"]?.GetValue<string>(); }
        catch (Exception ex) when (ex is FormatException or InvalidOperationException)
        { errors["remarks"] = ["Remarks must be text."]; return null; }

        text = string.IsNullOrWhiteSpace(text) ? null : text.Trim();
        if (text is { Length: > 500 }) errors["remarks"] = ["Remarks must be 500 characters or fewer."];
        return text;
    }

    // Returns a dictionary of the grade fields to apply. With requireKeys=true only keys present in the body are included.
    private static Dictionary<string, decimal?> ReadGradeValues(
        JsonObject body, Dictionary<string, string[]> errors, bool requireKeys)
    {
        var result = new Dictionary<string, decimal?>();
        foreach (var key in new[] { "prelim", "midterm", "finals" })
        {
            if (!body.ContainsKey(key))
            {
                if (!requireKeys) result[key] = null;
                continue;
            }

            decimal? value;
            try { value = body[key]?.GetValue<decimal>(); }
            catch (Exception ex) when (ex is FormatException or InvalidOperationException)
            { errors[key] = ["Must be a number."]; continue; }

            var problem = GradeRules.Validate(value);
            if (problem != null) { errors[key] = [problem]; continue; }

            result[key] = value;
        }
        return result;
    }

    private static string Fmt(decimal? v) => v?.ToString("0.00", CultureInfo.InvariantCulture) ?? "";

    // CSV-safe cell. Also defuses spreadsheet formulas (=, +, -, @) in teacher-typed remarks and names.
    private static string Csv(string value)
    {
        if (value.Length > 0 && "=+-@".Contains(value[0])) value = "'" + value;
        return value.IndexOfAny([',', '"', '\n', '\r']) >= 0 ? "\"" + value.Replace("\"", "\"\"") + "\"" : value;
    }
}