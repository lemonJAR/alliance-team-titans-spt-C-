using System;
using System.Collections.Generic;

namespace SptApi.Models;

public partial class Subject
{
    public int Id { get; set; }

    public int ProgramId { get; set; }

    public string Code { get; set; } = null!;

    public string Name { get; set; } = null!;

    public int Units { get; set; }

    public sbyte YearLevel { get; set; }

    public sbyte Semester { get; set; }

    public virtual ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();

    public virtual ICollection<Offering> Offerings { get; set; } = new List<Offering>();

    public virtual AcademicProgram Program { get; set; } = null!;

    public virtual ICollection<Subject> Prerequisites { get; set; } = new List<Subject>();

    public virtual ICollection<Subject> Subjects { get; set; } = new List<Subject>();

    public virtual ICollection<Teacher> Teachers { get; set; } = new List<Teacher>();
}