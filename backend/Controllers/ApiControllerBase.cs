using Microsoft.AspNetCore.Mvc;
using SptApi.Common;

namespace SptApi.Controllers;

// Every controller follows the same rule: receive the request, call ONE service method, return its result.
// No business logic, validation or database access lives in a controller.
// This base class is the single place that turns a ServiceResult into an HTTP status code.
[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected IActionResult Respond(ServiceResult result) => result.Status switch
    {
        ResultStatus.Ok => Ok(result.Body),
        ResultStatus.Created => StatusCode(StatusCodes.Status201Created, result.Body),
        ResultStatus.BadRequest => BadRequest(result.Body),
        ResultStatus.Unauthorized => Unauthorized(),
        ResultStatus.Forbidden => StatusCode(StatusCodes.Status403Forbidden, result.Body),
        ResultStatus.NotFound => NotFound(result.Body),
        ResultStatus.Conflict => Conflict(result.Body),
        _ => StatusCode(StatusCodes.Status500InternalServerError)
    };
}
