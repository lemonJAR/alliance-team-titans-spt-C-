namespace SptApi.Models;

// Values of enrollments.request_status.
//   PENDING  -> student requested the subject
//   APPROVED -> admin approved, student can now pick a section
//   REJECTED -> admin declined, student may request again
//   ENROLLED -> student picked a section (a slot is taken)
public static class EnrollmentStatus
{
    public const string Pending = "PENDING";
    public const string Approved = "APPROVED";
    public const string Rejected = "REJECTED";
    public const string Enrolled = "ENROLLED";

    public static bool IsKnown(string status) => status is Pending or Approved or Rejected or Enrolled;
}
