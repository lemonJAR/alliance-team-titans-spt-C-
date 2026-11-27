using SptApi.Models;

namespace SptApi.Mappers;

// Notifications and audit-log entries.
public static class ActivityMapper
{
    public static object ToDto(Notification n, bool includeRecipient)
    {
        var category = NotificationCategory(n.Message);
        return new
        {
            id = n.Id,
            message = n.Message,
            title = NotificationTitle(category),
            category,
            is_read = n.IsRead,
            created_at = n.CreatedAt,
            recipient_email = includeRecipient ? n.User.Email : null
        };
    }

    public static object ToDto(AuditLog l) => new
    {
        id = l.Id,
        actor_id = l.ActorId,
        actor_type = l.ActorType,
        user_email = l.UserEmail,
        action = l.Action,
        entity = l.Entity,
        entity_id = l.EntityId,
        details = l.Details,
        created_at = l.CreatedAt
    };

    // The table stores only a message, so the category and title are worked out from the text.
    private static string NotificationCategory(string message)
    {
        var m = message.ToLowerInvariant();
        if (m.Contains("grade")) return "GRADE";
        if (m.Contains("approved") || m.Contains("enroll") || m.Contains("schedule")) return "ENROLLMENT";
        return "SYSTEM";
    }

    private static string NotificationTitle(string category) => category switch
    {
        "GRADE" => "Grade update",
        "ENROLLMENT" => "Enrollment update",
        _ => "Notification"
    };
}
