using System;
using System.Collections.Generic;

namespace SptApi.Models;

public partial class Grade
{
    public int Id { get; set; }

    public int EnrollmentId { get; set; }

    public decimal? Prelim { get; set; }

    public decimal? Midterm { get; set; }

    public decimal? Finals { get; set; }

    public string? Remarks { get; set; }

    public int EnteredBy { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual Enrollment Enrollment { get; set; } = null!;

    public virtual User EnteredByNavigation { get; set; } = null!;
}
