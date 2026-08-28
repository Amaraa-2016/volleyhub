using volleyhub_api.DTO;
using volleyhub_api.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace volleyhub_api.Controllers;

// The platform console: reviewing club registration applications. Cross-tenant, so it takes no
// tenantid header. Every action re-reads public.platform_admin, so revoking the role takes effect
// immediately rather than when the token expires.
[Authorize]
[ApiController]
[Route("api/vh/platform")]
public class PlatformController : ApiControllerBase
{
    private readonly ILogger<PlatformController> _logger;
    private readonly AccountService _service;

    protected override ILogger Logger => _logger;

    public PlatformController(ILogger<PlatformController> logger, AccountService service)
    {
        _logger = logger;
        _service = service;
    }

    private async Task AssertAdmin()
    {
        if (!await _service.IsPlatformAdmin(AccountId()))
            throw new UnauthorizedAccessException("not_platform_admin");
    }

    [HttpGet("me")]
    public Task<IActionResult> Me() =>
        Run(async () => new { isplatformadmin = await _service.IsPlatformAdmin(AccountId()) });

    [HttpGet("requests")]
    public Task<IActionResult> Requests([FromQuery] string? status) =>
        Run(async () =>
        {
            await AssertAdmin();
            return await _service.ListRequests(status);
        });

    [HttpPost("requests/{id:int}/approve")]
    public Task<IActionResult> Approve(int id, [FromBody] ReviewRequestBT? data) =>
        Run(async () =>
        {
            await AssertAdmin();
            return await _service.ApproveRequest(id, AccountId(), data ?? new ReviewRequestBT());
        });

    [HttpPost("requests/{id:int}/reject")]
    public Task<IActionResult> Reject(int id, [FromBody] ReviewRequestBT? data) =>
        Run(async () =>
        {
            await AssertAdmin();
            return await _service.RejectRequest(id, AccountId(), data ?? new ReviewRequestBT());
        });

    [HttpGet("tenants")]
    public Task<IActionResult> Tenants() =>
        Run(async () =>
        {
            await AssertAdmin();
            return await _service.AllTenants();
        });
}
