using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Mappers;
using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

// The enrollment flow:
//   1. Student requests subjects            -> PENDING
//   2. Admin approves or rejects            -> APPROVED / REJECTED   (EnrollmentQueueService)
//   3. Student picks a section (offering)   -> ENROLLED   (this is where a slot is taken)
public class EnrollmentService(
    IStudentRepository students,
    ITermRepository terms,
    ISubjectRepository subjects,
    IEnrollmentRepository enrollments,
    IOfferingRepository offerings,
    ISemesterLoadRepository semesterLoads,
    IGradeRepository grades,
    IUnitOfWork unitOfWork,
    IAuditService audit,
    ICurrentUser currentUser) : IEnrollmentService
{
    // Used when an admin hasn't set a semester load for the student's program / year / semester.
    private const int DefaultMaxUnits = 27;
    private const string NoStudent = "No student profile for this account.";
    private const string NoActiveTerm = "There is no active enrollment period.";

    // Curriculum subjects for the student's year level and the active term's semester,
    // each with the student's current request status (null = not requested yet).
    public async Task<ServiceResult> GetProspectusAsync()
    {
        var student = await CurrentStudentAsync();
        if (student is null) return ServiceResult.NotFound(NoStudent);

        var term = await terms.GetActiveAsync();
        if (term is null || student.ProgramId is null) return ServiceResult.Ok(Array.Empty<object>());

        var curriculum = await subjects.GetCurriculumAsync(student.ProgramId.Value, student.YearLevel, term.Semester);
        var mine = (await enrollments.GetByStudentAndTermAsync(student.Id, term.Id)).ToDictionary(e => e.SubjectId);

        return ServiceResult.Ok(curriculum.Select(s => EnrollmentMapper.ToProspectusItem(s, mine.GetValueOrDefault(s.Id))));
    }

    // Each subject is checked on its own, so one bad subject doesn't block the rest.
    // Reply: { requested: ["IT101", ...], errors: ["IT103: ...", ...] }
    public async Task<ServiceResult> RequestSubjectsAsync(SubjectRequestBody request)
    {
        var student = await CurrentStudentAsync();
        if (student is null) return ServiceResult.NotFound(NoStudent);
        if (student.ProgramId is null)
            return ServiceResult.BadRequest("Your account has no program yet. Please contact the registrar.");

        var term = await terms.GetActiveAsync();
        if (term is null) return ServiceResult.BadRequest(NoActiveTerm);

        var ids = (request.SubjectIds ?? []).Distinct().ToList();
        if (ids.Count == 0) return ServiceResult.BadRequest("Select at least one subject.");

        var requestedSubjects = await subjects.GetByIdsWithPrerequisitesAsync(ids);
        var existing = await enrollments.GetByStudentAndTermAsync(student.Id, term.Id);
        var load = await semesterLoads.FindAsync(student.ProgramId.Value, student.YearLevel, term.Semester);
        var maxUnits = load?.MaxUnits ?? DefaultMaxUnits;

        // Units already committed this term (rejected requests don't count).
        var usedUnits = existing.Where(e => e.RequestStatus != EnrollmentStatus.Rejected).Sum(e => e.Subject.Units);

        var requested = new List<string>();
        var errors = new List<string>();
        var added = new List<Enrollment>();
        var reRequested = new List<Enrollment>();

        foreach (var id in ids)
        {
            if (!requestedSubjects.TryGetValue(id, out var subject)) { errors.Add($"Subject #{id}: not found."); continue; }

            var prior = existing.FirstOrDefault(e => e.SubjectId == id);
            var problem = await CheckEligibilityAsync(student, term, subject, prior, usedUnits, maxUnits);
            if (problem != null) { errors.Add($"{subject.Code}: {problem}"); continue; }

            if (prior != null)                       // re-request after a rejection
            {
                prior.RequestStatus = EnrollmentStatus.Pending;
                prior.CreatedAt = DateTime.UtcNow;
                reRequested.Add(prior);
            }
            else
            {
                added.Add(new Enrollment
                {
                    StudentId = student.Id,
                    SubjectId = id,
                    TermId = term.Id,
                    RequestStatus = EnrollmentStatus.Pending,
                    CreatedAt = DateTime.UtcNow
                });
            }
            usedUnits += subject.Units;
            requested.Add(subject.Code);
        }

        if (requested.Count > 0)
        {
            await unitOfWork.ExecuteInTransactionAsync(async () =>
            {
                if (reRequested.Count > 0) await enrollments.UpdateRangeAsync(reRequested);
                if (added.Count > 0) await enrollments.AddRangeAsync(added);
            });
            await audit.LogAsync("ENROLLMENT_REQUEST", "Enrollment", null, $"Requested: {string.Join(", ", requested)}");
        }

        return ServiceResult.Ok(new { requested, errors });
    }

    // Approved subjects, each with the sections the student can pick from.
    public async Task<ServiceResult> GetApprovedSubjectsAsync()
    {
        var student = await CurrentStudentAsync();
        if (student is null) return ServiceResult.NotFound(NoStudent);

        var term = await terms.GetActiveAsync();
        if (term is null) return ServiceResult.Ok(Array.Empty<object>());

        var approved = await enrollments.GetApprovedAsync(student.Id, term.Id);
        var sections = await offerings.GetForSubjectsInTermAsync(term.Id, approved.Select(e => e.SubjectId));

        return ServiceResult.Ok(approved.Select(e =>
            EnrollmentMapper.ToScheduleItem(e, sections.Where(o => o.SubjectId == e.SubjectId))));
    }

    // Takes a slot and confirms the enrollment, all in one transaction.
    public async Task<ServiceResult> SelectSectionAsync(SelectScheduleRequest request)
    {
        var student = await CurrentStudentAsync();
        if (student is null) return ServiceResult.NotFound(NoStudent);
        if (request.EnrollmentId is null || request.OfferingId is null)
            return ServiceResult.BadRequest("enrollment_id and offering_id are required.");

        var term = await terms.GetActiveAsync();
        if (term is null) return ServiceResult.BadRequest(NoActiveTerm);

        // Same answer whether it doesn't exist or belongs to another student.
        var enrollment = await enrollments.GetForStudentAsync(request.EnrollmentId.Value, student.Id);
        if (enrollment is null) return ServiceResult.NotFound("Enrollment not found.");
        if (enrollment.TermId != term.Id) return ServiceResult.BadRequest("That enrollment is not in the active term.");
        if (enrollment.RequestStatus != EnrollmentStatus.Approved)
            return ServiceResult.BadRequest(enrollment.RequestStatus == EnrollmentStatus.Enrolled
                ? "You are already enrolled in this subject."
                : "This subject has not been approved yet.");

        var offering = await offerings.GetByIdAsync(request.OfferingId.Value);
        if (offering is null || offering.TermId != enrollment.TermId || offering.SubjectId != enrollment.SubjectId)
            return ServiceResult.BadRequest("That section is not available for this subject.");

        var enrolled = await unitOfWork.ExecuteInTransactionAsync(async () =>
        {
            if (!await offerings.TryClaimSlotAsync(offering.Id)) return false;

            enrollment.OfferingId = offering.Id;
            enrollment.RequestStatus = EnrollmentStatus.Enrolled;
            enrollment.EnrolledAt = DateTime.UtcNow;
            await enrollments.UpdateAsync(enrollment);
            return true;
        });
        if (!enrolled) return ServiceResult.Conflict("That section is full. Please pick another.");

        await audit.LogAsync("ENROLLMENT_CONFIRMED", "Enrollment", enrollment.Id, $"Enrolled in {offering.OfferCode}");
        return ServiceResult.Ok(new { offer_code = offering.OfferCode, schedule = offering.Schedule, room = offering.Room });
    }

    // Returns why the subject can't be requested, or null when it can.
    private async Task<string?> CheckEligibilityAsync(
        Student student, AcademicTerm term, Subject subject, Enrollment? prior, int usedUnits, int maxUnits)
    {
        if (subject.ProgramId != student.ProgramId) return "not part of your program.";
        if (subject.YearLevel != student.YearLevel || subject.Semester != term.Semester)
            return "not offered for your year level this semester.";
        if (prior != null && prior.RequestStatus != EnrollmentStatus.Rejected)
            return $"already {prior.RequestStatus.ToLowerInvariant()}.";

        // Every prerequisite needs a passing final grade from an earlier enrollment.
        var missing = new List<string>();
        foreach (var pre in subject.Prerequisites)
        {
            if (!await grades.HasPassedSubjectAsync(student.Id, pre.Id, GradeRules.Passing)) missing.Add(pre.Code);
        }
        if (missing.Count > 0) return $"prerequisite not passed ({string.Join(", ", missing)}).";

        if (usedUnits + subject.Units > maxUnits) return $"would exceed your {maxUnits}-unit limit.";
        return null;
    }

    private async Task<Student?> CurrentStudentAsync() =>
        currentUser.UserId is int id ? await students.GetByUserIdAsync(id) : null;
}
