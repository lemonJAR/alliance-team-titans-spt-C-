namespace SptApi.Models;

public partial class AcademicProgram
{
    public int Id { get; set; }

    public int CollegeId { get; set; }

    public string Code { get; set; } = null!;

    public string Name { get; set; } = null!;

    public virtual College College { get; set; } = null!;

    public virtual ICollection<SemesterLoad> SemesterLoads { get; set; } = new List<SemesterLoad>();

    public virtual ICollection<Student> Students { get; set; } = new List<Student>();

    public virtual ICollection<Subject> Subjects { get; set; } = new List<Subject>();
}