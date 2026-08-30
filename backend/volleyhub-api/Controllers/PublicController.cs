using volleyhub_api.DTO;
using volleyhub_api.Service;
using volleyhub_api.Service.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace volleyhub_api.Controllers;

// Everything the public site reads without anyone logging in: the course directory, volleyball
// news, the shop, and the images for all three. No tenantid header and no token - which is exactly
// why these endpoints live apart from the per-centre ones rather than being an anonymous mode of
// them.
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
    private readonly IFileStorage _storage;

    protected override ILogger Logger => _logger;

    public PublicController(ILogger<PublicController> logger, PublicSiteService site,
        PlatformContentService content, IFileStorage storage)
    {
        _logger = logger;
        _site = site;
        _content = content;
        _storage = storage;
    }

    // ---- images -----------------------------------------------------------

    // Serves an uploaded image from MinIO. The bytes pass through the API so MinIO never has to be
    // reachable from outside the cluster - one open port instead of two.
    //
    // Keys are random and an object is never rewritten under the same key, so the response can be
    // cached hard: the only way an image changes is by getting a new URL.
    [HttpGet("media/{**key}")]
    public async Task<IActionResult> Media(string key, CancellationToken ct)
    {
        // The key comes straight from the URL, so it must not be able to walk out of the bucket.
        if (string.IsNullOrWhiteSpace(key) || key.Contains("..")) return NotFound();

        var file = await _storage.Open(key, ct);
        if (file == null) return NotFound();

        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        return File(file.content, file.contentType);
    }

    // ---- course directory -------------------------------------------------

    [HttpGet("trainings")]
    public Task<IActionResult> Trainings([FromQuery] string? q) =>
        Run(async () => await _site.Courses(q));

    // A course is identified by its centre and its id together: group ids are only unique inside
    // one centre's schema.
    [HttpGet("trainings/{tenantId:int}/{groupId:long}")]
    public Task<IActionResult> Training(int tenantId, long groupId) =>
        Run(async () => await _site.Course(tenantId, groupId));

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
