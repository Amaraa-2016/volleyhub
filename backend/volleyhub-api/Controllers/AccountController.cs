using volleyhub_api.DTO;
using volleyhub_api.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace volleyhub_api.Controllers;

// The coach's identity: register, login, profile. Registering only creates the account - the
// coach's data lives in the shared app schema under their accountid.
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
}
