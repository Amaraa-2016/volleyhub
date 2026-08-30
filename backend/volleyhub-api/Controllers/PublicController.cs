using volleyhub_api.DTO;
using volleyhub_api.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace volleyhub_api.Controllers;

// Everything the public site reads without anyone logging in: the training directory, volleyball
// news and the shop. No tenantid header and no token - which is exactly why these endpoints live
// apart from the per-centre ones rather than being an anonymous mode of them.
//
// The only write here is placing a shop enquiry, which is deliberate: the shop is meant to be
// usable without an account.
[AllowAnonymous]
[ApiController]
[Route("api/vh/public")]
public class PublicController : ApiControllerBase
{
    private readonly ILogger<PublicController> _logger;
    private readonly PublicSiteService _site;
    private readonly PlatformContentService _content;

    protected override ILogger Logger => _logger;

    public PublicController(ILogger<PublicController> logger, PublicSiteService site, PlatformContentService content)
    {
        _logger = logger;
        _site = site;
        _content = content;
    }

    // ---- training directory ----------------------------------------------

    [HttpGet("trainings")]
    public Task<IActionResult> Trainings([FromQuery] string? q, [FromQuery] string? city, [FromQuery] int? age) =>
        Run(async () => await _site.Trainings(q, city, age));

    [HttpGet("trainings/{id:int}")]
    public Task<IActionResult> Training(int id) =>
        Run(async () => await _site.Training(id));

    [HttpGet("cities")]
    public Task<IActionResult> Cities() =>
        Run(async () => await _site.Cities());

    // ---- news -------------------------------------------------------------

    [HttpGet("news")]
    public Task<IActionResult> News([FromQuery] short? category, [FromQuery] int take = 30) =>
        Run(async () => await _content.News(category, publishedOnly: true, take: Math.Clamp(take, 1, 100)));

    [HttpGet("news/{id:long}")]
    public Task<IActionResult> NewsItem(long id) =>
        Run(async () => await _content.NewsItem(id, publishedOnly: true));

    // ---- shop -------------------------------------------------------------

    [HttpGet("products")]
    public Task<IActionResult> Products([FromQuery] string? category, [FromQuery] string? q) =>
        Run(async () => await _content.Products(category, q, activeOnly: true));

    [HttpGet("products/{id:long}")]
    public Task<IActionResult> Product(long id) =>
        Run(async () => await _content.Product(id, activeOnly: true));

    [HttpGet("product-categories")]
    public Task<IActionResult> ProductCategories() =>
        Run(async () => await _content.ProductCategories());

    // Placing an enquiry. Anonymous is allowed; when the caller happens to be logged in the token
    // is honoured so the order can be tied to their account.
    [HttpPost("orders")]
    public Task<IActionResult> PlaceOrder([FromBody] OrderBT data) =>
        Run(async () => await _content.PlaceOrder(data, AccountId()));
}
