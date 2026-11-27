namespace SptApi.Dtos.Requests;

// Request bodies for the admin "People" pages.
// Employee IDs and student ID numbers are NOT sent: the server generates them (see IdNumberService).

public class AdminCreateTeacherRequest
{
    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }
    public int? Department { get; set; }          // college id (frontend sends "department")
    public List<int>? Subjects { get; set; }      // subject ids
}

public class AdminCreateStudentRequest
{
    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }
    public int? Program { get; set; }             // program id (frontend sends "program")
    public int? YearLevel { get; set; }
}

public class UpdateTeacherSubjectsRequest
{
    public List<int>? Subjects { get; set; }
}

public class AdminUpdateUserRequest
{
    public bool? IsActive { get; set; }
    public string? FirstName { get; set; }
    public string? MiddleName { get; set; }
    public string? LastName { get; set; }
}
