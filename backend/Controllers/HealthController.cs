using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SptApi.Data;

namespace SptApi.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController(SptDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get() =>
        Ok(new { status = "ok", students = await db.Students.CountAsync() });
}