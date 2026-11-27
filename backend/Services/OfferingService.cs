using SptApi.Common;
using SptApi.Dtos.Queries;
using SptApi.Dtos.Requests;
using SptApi.Mappers;
using SptApi.Models;
using SptApi.Repositories;

namespace SptApi.Services;

public class OfferingService(
    IOfferingRepository offerings,
    ITermRepository terms,
    ISubjectRepository subjects,
    ITeacherRepository teachers,
    IEnrollmentRepository enrollments,
    IAuditService audit,
    ICurrentUser currentUser) : IOfferingService
{
    private const string NoTeacher = "No teacher profile for this account.";

    public async Task<ServiceResult> GetAllAsync(OfferingFilter filter)
    {
        var rows = await offerings.GetFilteredAsync(filter);
        return ServiceResult.Ok(rows.Select(EnrollmentMapper.ToOfferingDto));
    }

    public async Task<ServiceResult> CreateAsync(OfferingRequest request)
    {
        var schedule = (request.Schedule ?? "").Trim();
        var room = Validation.EmptyToNull(request.Room);

        var term = request.Term is int tid ? await terms.GetByIdAsync(tid) : null;
        var subject = request.Subject is int sid ? await subjects.GetByIdAsync(sid) : null;

        var errors = new Dictionary<string, string[]>();
        if (term is null) errors["term"] = ["Term not found."];
        if (subject is null) errors["subject"] = ["Subject not found."];
        if (schedule == "") errors["schedule"] = ["Schedule is required."];
        else if (schedule.Length > 120) errors["schedule"] = ["Schedule must be 120 characters or fewer."];
        if (room is { Length: > 60 }) errors["room"] = ["Room must be 60 characters or fewer."];
        if (request.MaxSlots is null or < 1 or > 200) errors["max_slots"] = ["Slots must be between 1 and 200."];

        if (request.Teacher is int teacherId)
        {
            var teacher = await teachers.GetByIdWithUserAsync(teacherId);
            if (teacher is null) errors["teacher"] = ["Teacher not found."];
            else if (teacher.User.IsActive == false) errors["teacher"] = ["That teacher's account is not active."];
        }
        if (errors.Count > 0) return ServiceResult.Invalid(errors);

        var offering = new Offering
        {
            TermId = term!.Id,
            SubjectId = subject!.Id,
            TeacherId = request.Teacher,
            OfferCode = await NextOfferCodeAsync(term, subject),
            Schedule = schedule,
            Room = room,
            MaxSlots = request.MaxSlots!.Value,
            CurrentSlots = 0
        };
        await offerings.AddAsync(offering);

        await audit.LogAsync("OFFERING_CREATE", "Offering", offering.Id,
            $"Created {offering.OfferCode}: {schedule}, {offering.MaxSlots} slots");

        var created = await offerings.GetByIdWithDetailsAsync(offering.Id);
        return ServiceResult.Created(EnrollmentMapper.ToOfferingDto(created!));
    }

    // Professor's own sections; defaults to the active term.
    public async Task<ServiceResult> GetMineAsync(int? termId)
    {
        var teacher = await CurrentTeacherAsync();
        if (teacher is null) return ServiceResult.NotFound(NoTeacher);

        var rows = await offerings.GetForTeacherAsync(teacher.Id, termId);
        return ServiceResult.Ok(rows.Select(EnrollmentMapper.ToOfferingDto));
    }

    public async Task<ServiceResult> GetMyClassListAsync(int offeringId)
    {
        var teacher = await CurrentTeacherAsync();
        if (teacher is null) return ServiceResult.NotFound(NoTeacher);

        // Same answer for "doesn't exist" and "belongs to someone else".
        if (!await offerings.IsOwnedByTeacherAsync(offeringId, teacher.Id))
            return ServiceResult.NotFound("Offering not found.");

        var rows = await enrollments.GetEnrolledInOfferingAsync(offeringId);
        return ServiceResult.Ok(rows.Select(EnrollmentMapper.ToRosterItem));
    }

    // Code looks like IT101-1-01 (subject code, term id, section number). Skips numbers already taken.
    private async Task<string> NextOfferCodeAsync(AcademicTerm term, Subject subject)
    {
        var n = await offerings.CountForSubjectInTermAsync(term.Id, subject.Id) + 1;
        string code;
        do { code = $"{subject.Code}-{term.Id}-{n++:D2}"; }
        while (await offerings.CodeExistsAsync(code));
        return code;
    }

    private async Task<Teacher?> CurrentTeacherAsync() =>
        currentUser.UserId is int id ? await teachers.GetByUserIdAsync(id) : null;
}
