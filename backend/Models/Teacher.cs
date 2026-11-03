using System;
using System.Collections.Generic;

namespace SptApi.Models;

public partial class Teacher
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string EmployeeId { get; set; } = null!;

    public int? CollegeId { get; set; }

    public string? DepartmentCode { get; set; }

    public virtual College? College { get; set; }

    public virtual ICollection<Offering> Offerings { get; set; } = new List<Offering>();

    public virtual User User { get; set; } = null!;

    public virtual ICollection<Subject> Subjects { get; set; } = new List<Subject>();
}
