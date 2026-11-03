using System;
using System.Collections.Generic;

namespace SptApi.Models;

public partial class Offering
{
    public int Id { get; set; }

    public int TermId { get; set; }

    public int SubjectId { get; set; }

    public int? TeacherId { get; set; }

    public string OfferCode { get; set; } = null!;

    public int MaxSlots { get; set; }

    public int CurrentSlots { get; set; }

    public virtual ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();

    public virtual Subject Subject { get; set; } = null!;

    public virtual Teacher? Teacher { get; set; }

    public virtual AcademicTerm Term { get; set; } = null!;
}
