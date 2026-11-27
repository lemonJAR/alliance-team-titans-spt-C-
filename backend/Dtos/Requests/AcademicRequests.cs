namespace SptApi.Dtos.Requests;

// Request bodies for school setup, terms, offerings, enrollment and notifications.

public class CollegeRequest
{
    public string? Code { get; set; }
    public string? Name { get; set; }
}

public class ProgramRequest
{
    public int? College { get; set; }      // college id
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

public class TermRequest
{
    public string? SchoolYear { get; set; }     // e.g. 2025-2026
    public int? Semester { get; set; }          // 1 or 2
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool? IsActive { get; set; }
}

public class OfferingRequest
{
    public int? Term { get; set; }
    public int? Subject { get; set; }
    public int? Teacher { get; set; }       // optional: a section can be created before a teacher is picked
    public string? Schedule { get; set; }
    public string? Room { get; set; }
    public int? MaxSlots { get; set; }
}

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

public class MarkReadRequest
{
    public bool? MarkAll { get; set; }
    public List<int>? Ids { get; set; }
}
