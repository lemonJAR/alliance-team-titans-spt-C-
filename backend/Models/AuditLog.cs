using System;
using System.Collections.Generic;

namespace SptApi.Models;

public partial class AuditLog
{
    public int Id { get; set; }

    public int? ActorId { get; set; }

    public string? ActorType { get; set; }

    public string? UserEmail { get; set; }

    public string Action { get; set; } = null!;

    public string? Entity { get; set; }

    public int? EntityId { get; set; }

    public string? Details { get; set; }

    public string? IpAddress { get; set; }

    public DateTime CreatedAt { get; set; }
}
