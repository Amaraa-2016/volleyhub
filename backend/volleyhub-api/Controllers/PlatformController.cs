using volleyhub_api.DTO;
using volleyhub_api.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace volleyhub_api.Controllers;

// The platform console: reviewing training-centre applications, and owning the content the public
// site shows - volleyball news and the shop. Cross-tenant, so it takes no tenantid header.
//
// Every action re-reads public.platform_admin, so revoking the role takes effect immediately rather
// than when the token expires.
[Authorize]
[ApiController]
[Route("api/vh/platform")]
public class PlatformController : ApiControllerBase
{
    private readonly ILogger<PlatformController> _logger;
    private readonly AccountService _service;
    private readonly PlatformContentService _content;

    protected override ILogger Logger => _logger;

    public PlatformController(ILogger<PlatformController> logger, AccountService service,
        PlatformContentService content)
    {
        _logger = logger;
        _service = service;
        _content = content;
    }

    private async Task AssertAdmin()
    {
        if (!await _service.IsPlatformAdmin(AccountId()))
            throw new UnauthorizedAccessException("not_platform_admin");
    }

    [HttpGet("me")]
    public Task<IActionResult> Me() =>
        Run(async () => new { isplatformadmin = await _service.IsPlatformAdmin(AccountId()) });

    // ---- training-centre applications -------------------------------------

    [HttpGet("requests")]
    public Task<IActionResult> Requests([FromQuery] string? status) =>
        Run(async () => { await AssertAdmin(); return await _service.ListRequests(status); });

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
        Run(async () => { await AssertAdmin(); return await _service.AllTenants(); });

    // ---- news -------------------------------------------------------------

    [HttpGet("news")]
    public Task<IActionResult> News([FromQuery] short? category) =>
        Run(async () => { await AssertAdmin(); return await _content.News(category, publishedOnly: false, take: 200); });

    [HttpGet("news/{id:long}")]
    public Task<IActionResult> NewsItem(long id) =>
        Run(async () => { await AssertAdmin(); return await _content.NewsItem(id, publishedOnly: false); });

    [HttpPost("news")]
    public Task<IActionResult> SaveNews([FromBody] NewsBT data) =>
        Run(async () => { await AssertAdmin(); return await _content.SaveNews(data, AccountId()); });

    [HttpDelete("news/{id:long}")]
    public Task<IActionResult> DeleteNews(long id) =>
        Run(async () => { await AssertAdmin(); return await _content.DeleteNews(id); });

    // ---- shop -------------------------------------------------------------

    [HttpGet("products")]
    public Task<IActionResult> Products([FromQuery] string? category, [FromQuery] string? q) =>
        Run(async () => { await AssertAdmin(); return await _content.Products(category, q, activeOnly: false); });

    [HttpPost("products")]
    public Task<IActionResult> SaveProduct([FromBody] ProductBT data) =>
        Run(async () => { await AssertAdmin(); return await _content.SaveProduct(data); });

    [HttpDelete("products/{id:long}")]
    public Task<IActionResult> DeleteProduct(long id) =>
        Run(async () => { await AssertAdmin(); return await _content.DeleteProduct(id); });

    // ---- orders -----------------------------------------------------------

    [HttpGet("orders")]
    public Task<IActionResult> Orders([FromQuery] short? status) =>
        Run(async () => { await AssertAdmin(); return await _content.Orders(status); });

    [HttpPost("orders/{id:long}/status")]
    public Task<IActionResult> SetOrderStatus(long id, [FromBody] OrderStatusBT data) =>
        Run(async () => { await AssertAdmin(); return await _content.SetOrderStatus(id, data); });
}
