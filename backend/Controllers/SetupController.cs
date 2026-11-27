using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Services;

namespace SptApi.Controllers;

// School structure: colleges -> programs -> subjects, plus unit limits per semester.
// Anyone logged in can read it; only admins can change it.
[Route("api/system")]
[Authorize]
public class SetupController(
    ICollegeService colleges,
    IProgramService programs,
    ISubjectService subjects,
    ISemesterLoadService semesterLoads) : ApiControllerBase
{
    // GET /api/system/colleges
    [HttpGet("colleges")]
    public async Task<IActionResult> GetColleges() =>
        Respond(await colleges.GetAllAsync());

    // POST /api/system/colleges
    [HttpPost("colleges")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> AddCollege([FromBody] CollegeRequest request) =>
        Respond(await colleges.CreateAsync(request));

    // GET /api/system/programs?college=
    [HttpGet("programs")]
    public async Task<IActionResult> GetPrograms([FromQuery] int? college) =>
        Respond(await programs.GetAllAsync(college));

    // POST /api/system/programs
    [HttpPost("programs")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> AddProgram([FromBody] ProgramRequest request) =>
        Respond(await programs.CreateAsync(request));

    // GET /api/system/subjects?program=   or   ?college=
    [HttpGet("subjects")]
    public async Task<IActionResult> GetSubjects([FromQuery] int? program, [FromQuery] int? college) =>
        Respond(await subjects.GetAllAsync(program, college));

    // POST /api/system/subjects
    [HttpPost("subjects")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> AddSubject([FromBody] SubjectRequest request) =>
        Respond(await subjects.CreateAsync(request));

    // GET /api/system/semester-loads?program=
    [HttpGet("semester-loads")]
    public async Task<IActionResult> GetSemesterLoads([FromQuery] int? program) =>
        Respond(await semesterLoads.GetAllAsync(program));

    // POST /api/system/semester-loads   (creates, or updates that program/year/semester's load)
    [HttpPost("semester-loads")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> SetSemesterLoad([FromBody] SemesterLoadRequest request) =>
        Respond(await semesterLoads.SetAsync(request));
}
