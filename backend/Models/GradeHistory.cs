using System;
using System.Collections.Generic;

namespace SptApi.Models;

public partial class GradeHistory
{
    public int Id { get; set; }

    public int GradeId { get; set; }

    public int ChangedBy { get; set; }

    public string Action { get; set; } = null!;

    public string? OldValues { get; set; }

    public string? NewValues { get; set; }

    public DateTime ChangedAt { get; set; }

    public virtual User ChangedByNavigation { get; set; } = null!;
}
