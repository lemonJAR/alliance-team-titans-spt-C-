using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Services;

namespace SptApi.Controllers;

// Student: request subjects -> (admin approves) -> pick a section.
[Route("api/system/enrollment")]
[Authorize]
public class EnrollmentController(IEnrollmentService enrollment, IEnrollmentQueueService queue) : ApiControllerBase
{
    // GET /api/system/enrollment/request   prospectus for the active term
    [HttpGet("request")]
    [Authorize(Roles = Roles.Student)]
    public async Task<IActionResult> GetProspectus() =>
        Respond(await enrollment.GetProspectusAsync());

    // POST /api/system/enrollment/request   { subject_ids: [..] }
    [HttpPost("request")]
    [Authorize(Roles = Roles.Student)]
    public async Task<IActionResult> SubmitRequest([FromBody] SubjectRequestBody request) =>
        Respond(await enrollment.RequestSubjectsAsync(request));

    // GET /api/system/enrollment/schedule   approved subjects with their open sections
    [HttpGet("schedule")]
    [Authorize(Roles = Roles.Student)]
    public async Task<IActionResult> GetApprovedForSchedule() =>
        Respond(await enrollment.GetApprovedSubjectsAsync());

    // POST /api/system/enrollment/schedule   { enrollment_id, offering_id }
    [HttpPost("schedule")]
    [Authorize(Roles = Roles.Student)]
    public async Task<IActionResult> SelectSchedule([FromBody] SelectScheduleRequest request) =>
        Respond(await enrollment.SelectSectionAsync(request));

    // GET /api/system/enrollment/queue?status=PENDING   (admin, active term)
    [HttpGet("queue")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> GetQueue([FromQuery] string? status) =>
        Respond(await queue.GetQueueAsync(status));

    // PATCH /api/system/enrollment/queue   { enrollment_ids: [..], action: "APPROVED" | "REJECTED" }
    [HttpPatch("queue")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> ActOnQueue([FromBody] QueueActionRequest request) =>
        Respond(await queue.DecideAsync(request));
}
