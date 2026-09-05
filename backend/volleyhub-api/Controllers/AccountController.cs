using volleyhub_api.DTO;
using volleyhub_api.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace volleyhub_api.Controllers;

// Global identity and club membership, shared by the backoffice and the mobile app.
// Tenant-independent: anonymous flows need no tenantid header, and authenticated flows resolve the
// caller from the JWT accountid claim rather than the header.
[Authorize]
[ApiController]
[Route("api/vh/account")]
public class AccountController : ApiControllerBase
{
    private readonly ILogger<AccountController> _logger;
    private readonly AccountService _service;

    protected override ILogger Logger => _logger;

    public AccountController(ILogger<AccountController> logger, AccountService service)
    {
        _logger = logger;
        _service = service;
    }

    // ---- anonymous --------------------------------------------------------

    [AllowAnonymous]
    [HttpPost("register")]
    public Task<IActionResult> Register([FromBody] AccountRegisterBT data) =>
        Run(async () => await _service.Register(data));

    [AllowAnonymous]
    [HttpPost("login")]
    public Task<IActionResult> Login([FromBody] AccountLoginBT data) =>
        Run(async () => await _service.Login(data));

    [AllowAnonymous]
    [HttpGet("clubs")]
    public Task<IActionResult> SearchClubs([FromQuery] string? q) =>
        Run(async () => await _service.SearchTenants(q));

    // ---- profile ----------------------------------------------------------

    [HttpGet("me")]
    public Task<IActionResult> Me() =>
        Run(async () => await _service.Me(AccountId()));

    [HttpPut("me")]
    public Task<IActionResult> UpdateProfile([FromBody] AccountProfileBT data) =>
        Run(async () => await _service.UpdateProfile(AccountId(), data));

    [HttpPost("password")]
    public Task<IActionResult> ChangePassword([FromBody] ChangePasswordBT data) =>
        Run(async () => await _service.ChangePassword(AccountId(), data));

    // ---- clubs ------------------------------------------------------------

    [HttpGet("tenants")]
    public Task<IActionResult> Tenants() =>
        Run(async () => await _service.Tenants(AccountId()));

    [HttpPost("switch")]
    public Task<IActionResult> Switch([FromBody] SwitchTenantBT data) =>
        Run(async () => await _service.Switch(AccountId(), data.tenantid));

    [HttpPost("tenant/request")]
    public Task<IActionResult> RequestTenant([FromBody] TenantRequestBT data) =>
        Run(async () => await _service.RequestTenant(AccountId(), data));

    [HttpGet("tenant/request")]
    public Task<IActionResult> MyRequests() =>
        Run(async () => await _service.MyRequests(AccountId()));

    [HttpPost("join")]
    public Task<IActionResult> Join([FromBody] JoinRequestBT data) =>
        Run(async () => await _service.RequestJoin(AccountId(), data));

    // Asking to join one course, from its page on the public site.
    [HttpPost("course/request")]
    public Task<IActionResult> RequestCourse([FromBody] CourseRequestBT data) =>
        Run(async () => await _service.RequestCourse(AccountId(), data));

    [HttpGet("course/request")]
    public Task<IActionResult> MyCourseRequest([FromQuery] int tenantid, [FromQuery] long groupid) =>
        Run(async () => await _service.MyCourseRequest(AccountId(), tenantid, groupid));
}
