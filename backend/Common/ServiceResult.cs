namespace SptApi.Common;

// The outcome of a service call, independent of HTTP.
// Services return one of these; ApiControllerBase turns it into the matching HTTP response.
// This keeps status-code decisions out of the business logic and business logic out of the controllers.
public enum ResultStatus
{
    Ok,
    Created,
    BadRequest,
    Unauthorized,
    Forbidden,
    NotFound,
    Conflict
}

public sealed class ServiceResult
{
    public ResultStatus Status { get; }
    public object? Body { get; }

    private ServiceResult(ResultStatus status, object? body)
    {
        Status = status;
        Body = body;
    }

    public bool IsSuccess => Status is ResultStatus.Ok or ResultStatus.Created;

    // ───── success ─────
    public static ServiceResult Ok(object? body = null) => new(ResultStatus.Ok, body);
    public static ServiceResult Created(object? body) => new(ResultStatus.Created, body);

    // ───── failures ─────
    // { detail: "..." } is the shape every page reads for a general error message.
    public static ServiceResult BadRequest(string detail) => new(ResultStatus.BadRequest, new { detail });

    // { field_name: ["message"] } so forms can show the message under the field.
    public static ServiceResult Invalid(Dictionary<string, string[]> errors) => new(ResultStatus.BadRequest, errors);
    public static ServiceResult Invalid(string field, string message) => Invalid(new() { [field] = [message] });

    // { error: "..." } is used by the email-link pages (verify email, reset password).
    public static ServiceResult BadRequestError(string error) => new(ResultStatus.BadRequest, new { error });

    public static ServiceResult Unauthorized() => new(ResultStatus.Unauthorized, null);
    public static ServiceResult Forbidden(string detail) => new(ResultStatus.Forbidden, new { detail });
    public static ServiceResult NotFound(string detail) => new(ResultStatus.NotFound, new { detail });
    public static ServiceResult Conflict(string detail) => new(ResultStatus.Conflict, new { detail });
}
