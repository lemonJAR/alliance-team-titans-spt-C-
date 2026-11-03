using System;
using System.Collections.Generic;

namespace SptApi.Models;

public partial class SemesterLoad
{
    public int Id { get; set; }

    public int ProgramId { get; set; }

    public sbyte YearLevel { get; set; }

    public sbyte Semester { get; set; }

    public int MaxUnits { get; set; }

    public virtual AcademicProgram Program { get; set; } = null!;
}