using SptApi.Models;

namespace SptApi.Mappers;

// Offerings (sections) and enrollment requests.
public static class EnrollmentMapper
{
    public static object ToOfferingDto(Offering o) => new
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
        teacher_name = TeacherName(o),
        schedule = o.Schedule,
        room = o.Room,
        max_slots = o.MaxSlots,
        current_slots = o.CurrentSlots,
        available_slots = Math.Max(0, o.MaxSlots - o.CurrentSlots),
        is_full = o.CurrentSlots >= o.MaxSlots
    };

    // A section the student can pick in the schedule step.
    public static object ToSectionOption(Offering o) => new
    {
        id = o.Id,
        offer_code = o.OfferCode,
        schedule = o.Schedule,
        room = o.Room,
        teacher_name = TeacherName(o),
        max_slots = o.MaxSlots,
        current_slots = o.CurrentSlots,
        available_slots = Math.Max(0, o.MaxSlots - o.CurrentSlots)
    };

    // A student in a teacher's class list.
    public static object ToRosterItem(Enrollment e) => new
    {
        id = e.Id,                              // enrollment id (grades attach to this)
        student_id = e.StudentId,               // students.id
        student_id_no = e.Student.StudentIdNo,
        student_name = UserMapper.StudentDisplayName(e.Student),
        subject_id = e.SubjectId
    };

    public static object ToProspectusItem(Subject s, Enrollment? enrollment) => new
    {
        subject_id = s.Id,
        code = s.Code,
        name = s.Name,
        units = s.Units,
        prerequisites = s.Prerequisites.Select(p => p.Code),
        request_status = enrollment?.RequestStatus,
        enrollment_id = enrollment?.Id
    };

    public static object ToScheduleItem(Enrollment e, IEnumerable<Offering> sections) => new
    {
        id = e.Id,
        enrollment_id = e.Id,
        subject_id = e.SubjectId,
        subject_code = e.Subject.Code,
        subject_name = e.Subject.Name,
        units = e.Subject.Units,
        offerings = sections.Select(ToSectionOption)
    };

    public static object ToQueueItem(Enrollment e) => new
    {
        id = e.Id,
        request_status = e.RequestStatus,
        student_id = e.StudentId,
        student_id_no = e.Student.StudentIdNo,
        student_name = UserMapper.StudentDisplayName(e.Student),
        year_level = e.Student.YearLevel,
        program = e.Student.Program?.Name,
        program_code = e.Student.Program?.Code,
        subject_id = e.SubjectId,
        subject_code = e.Subject.Code,
        subject_name = e.Subject.Name,
        units = e.Subject.Units,
        requested_at = e.CreatedAt
    };

    private static string? TeacherName(Offering o) =>
        o.Teacher is null ? null : $"{o.Teacher.User.FirstName} {o.Teacher.User.LastName}";
}
