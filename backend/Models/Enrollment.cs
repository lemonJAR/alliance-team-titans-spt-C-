using System;
using System.Collections.Generic;

namespace SptApi.Models;

public partial class Enrollment
{
    public int Id { get; set; }

    public int StudentId { get; set; }

    public int SubjectId { get; set; }

    public int TermId { get; set; }

    public int? OfferingId { get; set; }

    public string RequestStatus { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? EnrolledAt { get; set; }

    public virtual Grade? Grade { get; set; }

    public virtual Offering? Offering { get; set; }

    public virtual Student Student { get; set; } = null!;

    public virtual Subject Subject { get; set; } = null!;

    public virtual AcademicTerm Term { get; set; } = null!;
}
