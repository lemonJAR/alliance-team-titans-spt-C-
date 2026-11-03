using System;
using System.Collections.Generic;

namespace SptApi.Models;

public partial class AcademicTerm
{
    public int Id { get; set; }

    public string SchoolYear { get; set; } = null!;

    public sbyte Semester { get; set; }

    public DateOnly StartDate { get; set; }

    public DateOnly EndDate { get; set; }

    public bool IsActive { get; set; }

    public virtual ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();

    public virtual ICollection<Offering> Offerings { get; set; } = new List<Offering>();
}
