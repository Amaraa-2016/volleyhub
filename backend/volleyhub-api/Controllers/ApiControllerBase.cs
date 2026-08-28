using Microsoft.AspNetCore.Mvc;

namespace volleyhub_api.Controllers;

// Shared plumbing: reading the caller out of the JWT, and one place that turns the service layer's
// exceptions into status codes. Services throw ArgumentException/InvalidOperationException for
// caller mistakes and UnauthorizedAccessException for anything they are not allowed to touch.
public abstract class ApiControllerBase : ControllerBase
{
    protected abstract ILogger Logger { get; }

    protected int AccountId() =>
        int.TryParse(User.FindFirst("accountid")?.Value, out var id) ? id : 0;

    protected int TenantId() =>
        int.TryParse(User.FindFirst("tenantid")?.Value, out var id) ? id : 0;

    protected int StaffId() =>
        int.TryParse(User.FindFirst("staffid")?.Value, out var id) ? id : 0;

    protected string Role() => User.FindFirst("role")?.Value ?? "";

    protected async Task<IActionResult> Run(Func<Task<object?>> fn)
    {
        try
        {
            return Ok(await fn());
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Request failed: {Path}", Request.Path);
            return StatusCode(500, new { error = "server_error" });
        }
    }
}
