using Microsoft.AspNetCore.Mvc;
using SptApi.Services;

namespace SptApi.Controllers;

[Route("api/health")]
public class HealthController(IHealthService health) : ApiControllerBase
{
    // GET /api/health
    [HttpGet]
    public async Task<IActionResult> Get() =>
        Respond(await health.CheckAsync());
}
