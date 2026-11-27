using SptApi.Models;

namespace SptApi.Mappers;

// School structure: colleges, programs, subjects, semester loads and terms.
public static class AcademicMapper
{
    public static object ToDto(College c) => new { id = c.Id, code = c.Code, name = c.Name };

    public static object ToDto(AcademicProgram p) => new
    {
        id = p.Id,
        college = p.CollegeId,
        college_id = p.CollegeId,
        college_code = p.College?.Code,
        college_name = p.College?.Name,
        code = p.Code,
        name = p.Name
    };

    public static object ToDto(Subject s) => new
    {
        id = s.Id,
        program = s.ProgramId,
        program_id = s.ProgramId,
        program_code = s.Program?.Code,
        program_name = s.Program?.Name,
        college = s.Program?.CollegeId,
        code = s.Code,
        name = s.Name,
        units = s.Units,
        year_level = s.YearLevel,
        semester = s.Semester,
        prerequisites = s.Prerequisites.Select(p => p.Id)
    };

    public static object ToCreatedDto(Subject s) => new { id = s.Id, code = s.Code, name = s.Name };

    // subjectsForLoad = the curriculum subjects for that program + year + semester.
    public static object ToDto(SemesterLoad l, IEnumerable<Subject> subjectsForLoad) => new
    {
        id = l.Id,
        program = l.ProgramId,
        program_id = l.ProgramId,
        program_code = l.Program.Code,
        program_name = l.Program.Name,
        college_id = l.Program.CollegeId,
        college_code = l.Program.College?.Code,
        college_name = l.Program.College?.Name,
        year_level = l.YearLevel,
        semester = l.Semester,
        max_units = l.MaxUnits,
        subjects = subjectsForLoad.OrderBy(s => s.Code)
            .Select(s => new { id = s.Id, code = s.Code, name = s.Name, units = s.Units })
    };

    public static object ToDto(AcademicTerm t) => new
    {
        id = t.Id,
        school_year = t.SchoolYear,
        semester = t.Semester,
        label = TermLabel(t),
        start_date = t.StartDate,
        end_date = t.EndDate,
        is_active = t.IsActive
    };

    public static string TermLabel(AcademicTerm t) => $"{t.SchoolYear} - Sem {t.Semester}";
}
