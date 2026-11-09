namespace SptApi.Models;

// Added after the scaffold. Offering.cs is generated, so these live in their own file
// and survive a re-scaffold. Matches database/03_offering_schedule_room.sql.
public partial class Offering
{
    public string Schedule { get; set; } = "TBA";

    public string? Room { get; set; }
}