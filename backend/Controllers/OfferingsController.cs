using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SptApi.Common;
using SptApi.Dtos.Queries;
using SptApi.Dtos.Requests;
using SptApi.Services;

namespace SptApi.Controllers;

[Route("api/system")]
[Authorize]
public class OfferingsController(IOfferingService offerings) : ApiControllerBase
{
    // GET /api/system/offerings?term=&program=&year_level=&semester=
    [HttpGet("offerings")]
    public async Task<IActionResult> GetOfferings(
        [FromQuery] int? term, [FromQuery] int? program,
        [FromQuery(Name = "year_level")] int? yearLevel, [FromQuery] int? semester) =>
        Respond(await offerings.GetAllAsync(new OfferingFilter(term, program, yearLevel, semester)));

    // POST /api/system/offerings
    [HttpPost("offerings")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> CreateOffering([FromBody] OfferingRequest request) =>
        Respond(await offerings.CreateAsync(request));

    // GET /api/system/teacher/offerings?term=   (defaults to the active term)
    [HttpGet("teacher/offerings")]
    [Authorize(Roles = Roles.Professor)]
    public async Task<IActionResult> GetMyOfferings([FromQuery] int? term) =>
        Respond(await offerings.GetMineAsync(term));

    // GET /api/system/teacher/offerings/{id}/enrollments
    [HttpGet("teacher/offerings/{id:int}/enrollments")]
    [Authorize(Roles = Roles.Professor)]
    public async Task<IActionResult> GetMyOfferingEnrollments(int id) =>
        Respond(await offerings.GetMyClassListAsync(id));
}
