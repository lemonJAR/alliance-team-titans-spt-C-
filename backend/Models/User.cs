using System;
using System.Collections.Generic;

namespace SptApi.Models;

public partial class User
{
    public int Id { get; set; }

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string Role { get; set; } = null!;

    public string FirstName { get; set; } = null!;

    public string? MiddleName { get; set; }

    public string LastName { get; set; } = null!;

    public bool? IsActive { get; set; }

    public bool EmailVerified { get; set; }

    public string? FcmToken { get; set; }

    public DateTime DateJoined { get; set; }

    public virtual ICollection<EmailToken> EmailTokens { get; set; } = new List<EmailToken>();

    public virtual ICollection<GradeHistory> GradeHistories { get; set; } = new List<GradeHistory>();

    public virtual ICollection<Grade> Grades { get; set; } = new List<Grade>();

    public virtual ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public virtual Student? Student { get; set; }

    public virtual Teacher? Teacher { get; set; }
}
