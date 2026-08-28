using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace volleyhub_api.Controllers;

// Liveness/readiness probe for the k3s deployment. Deliberately does not touch the database, so a
// slow query can never take the pod out of rotation.
[AllowAnonymous]
[ApiController]
[Route("api/vh/health")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok", utc = DateTime.UtcNow });
}
