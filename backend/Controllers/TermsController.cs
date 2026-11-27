using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SptApi.Common;
using SptApi.Dtos.Requests;
using SptApi.Services;

namespace SptApi.Controllers;

[Route("api/system/terms")]
[Authorize]
public class TermsController(ITermService terms) : ApiControllerBase
{
    // GET /api/system/terms   newest first
    [HttpGet]
    public async Task<IActionResult> GetTerms() =>
        Respond(await terms.GetAllAsync());

    // POST /api/system/terms
    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> CreateTerm([FromBody] TermRequest request) =>
        Respond(await terms.CreateAsync(request));

    // PATCH /api/system/terms/{id}
    [HttpPatch("{id:int}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> UpdateTerm(int id, [FromBody] TermRequest request) =>
        Respond(await terms.UpdateAsync(id, request));
}
