using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SptApi.Common;
using SptApi.Services;

namespace SptApi.Controllers;

// Student: own grades and timeline. Professor: own sections. Admin: everything (grade override).
[Route("api/system/grades")]
[Authorize]
public class GradesController(IGradeService grades, IGradeHistoryService history) : ApiControllerBase
{
    private const string StaffRoles = Roles.Professor + "," + Roles.Admin;

    // GET /api/system/grades/mine
    [HttpGet("mine")]
    [Authorize(Roles = Roles.Student)]
    public async Task<IActionResult> GetMine() =>
        Respond(await grades.GetMineAsync());

    // GET /api/system/grades?offering=&student=&term=&subject=&period=prelim|midterm|finals
    [HttpGet]
    [Authorize(Roles = StaffRoles)]
    public async Task<IActionResult> GetGrades(
        [FromQuery] int? offering, [FromQuery] int? student, [FromQuery] int? term,
        [FromQuery] int? subject, [FromQuery] string? period) =>
        Respond(await grades.SearchAsync(offering, student, term, subject, period));

    // GET /api/system/grades/{id}/history
    [HttpGet("{id:int}/history")]
    public async Task<IActionResult> GetHistory(int id) =>
        Respond(await history.GetForGradeAsync(id));

    // GET /api/system/grades/timeline?student=
    [HttpGet("timeline")]
    public async Task<IActionResult> GetTimeline([FromQuery] int? student) =>
        Respond(await history.GetTimelineAsync(student));

    // POST /api/system/grades   { student, subject, term, offering, prelim, midterm, finals, remarks }
    [HttpPost]
    [Authorize(Roles = StaffRoles)]
    public async Task<IActionResult> CreateGrade([FromBody] JsonObject body) =>
        Respond(await grades.CreateAsync(body));

    // PATCH /api/system/grades/{id}
    [HttpPatch("{id:int}")]
    [Authorize(Roles = StaffRoles)]
    public async Task<IActionResult> UpdateGrade(int id, [FromBody] JsonObject body) =>
        Respond(await grades.UpdateAsync(id, body));

    // DELETE /api/system/grades/{id}
    [HttpDelete("{id:int}")]
    [Authorize(Roles = StaffRoles)]
    public async Task<IActionResult> DeleteGrade(int id) =>
        Respond(await grades.DeleteAsync(id));
}
