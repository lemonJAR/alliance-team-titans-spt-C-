using System;
using System.Collections.Generic;

namespace SptApi.Models;

public partial class College
{
    public int Id { get; set; }

    public string Code { get; set; } = null!;

    public string Name { get; set; } = null!;

    public virtual ICollection<AcademicProgram> Programs { get; set; } = new List<AcademicProgram>();

    public virtual ICollection<Teacher> Teachers { get; set; } = new List<Teacher>();
}