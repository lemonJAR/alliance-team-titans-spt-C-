using System;
using System.Collections.Generic;

namespace SptApi.Models;

public partial class Student
{
    public int Id { get; set; }

    public int? UserId { get; set; }

    public string StudentIdNo { get; set; } = null!;

    public int? ProgramId { get; set; }

    public sbyte YearLevel { get; set; }

    public virtual ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();

    public virtual AcademicProgram? Program { get; set; }

    public virtual User? User { get; set; }
}