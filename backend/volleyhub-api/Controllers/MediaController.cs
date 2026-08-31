using volleyhub_api.Service;
using volleyhub_api.Service.Storage;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace volleyhub_api.Controllers;

// Image upload for both consoles. Two endpoints rather than one because the callers are different
// kinds of user: a training centre's staff may only add pictures to their own listing, while news
// covers and product photos belong to the platform.
//
// Uploads are validated here, not in the storage layer: content type, extension and size are a
// policy of this API, and the bucket is public-read - anything accepted becomes world-readable.
[Authorize]
[ApiController]
[Route("api/vh/media")]
public class MediaController : ApiControllerBase
{
    private readonly ILogger<MediaController> _logger;
    private readonly IFileStorage _storage;
    private readonly AccountService _account;

    protected override ILogger Logger => _logger;

    private const long MaxBytes = 5 * 1024 * 1024;

    // Extensions are checked alongside the content type: a browser will happily label anything
    // image/png, and the extension is what ends up in the public URL.
    private static readonly HashSet<string> AllowedExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif" };

    private static readonly string[] StaffRoles = ["owner", "admin", "coach"];

    public MediaController(ILogger<MediaController> logger, IFileStorage storage, AccountService account)
    {
        _logger = logger;
        _storage = storage;
        _account = account;
    }

    private async Task<object> Store(IFormFile? file, string folder)
    {
        if (!_storage.IsConfigured) throw new InvalidOperationException("storage_not_configured");
        if (file == null || file.Length == 0) throw new ArgumentException("file_required");
        if (file.Length > MaxBytes) throw new ArgumentException("file_too_large");

        var extension = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(extension)) throw new ArgumentException("unsupported_file_type");
        if (!(file.ContentType ?? "").StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("unsupported_file_type");

        await using var stream = file.OpenReadStream();
        var stored = await _storage.Upload(stream, file.FileName, file.ContentType!, folder);

        _logger.LogInformation("Uploaded {Key} ({Size} bytes)", stored.key, stored.size);
        return new { url = stored.url, size = stored.size };
    }

    // A training centre uploading to its own public listing. Scoped by tenant id so one centre's
    // pictures can never land in another's folder.
    [HttpPost("training")]
    [RequestSizeLimit(MaxBytes + 8192)]
    public Task<IActionResult> UploadTraining(IFormFile? file) =>
        Run(async () =>
        {
            if (!StaffRoles.Contains(Role())) throw new UnauthorizedAccessException("staff_only");
            return await Store(file, $"trainings/{TenantId()}");
        });

    // For someone who has an account but no centre yet - the logo on a registration application.
    // Scoped by account id, so one applicant's uploads cannot land in another's folder.
    [HttpPost("account")]
    [RequestSizeLimit(MaxBytes + 8192)]
    public Task<IActionResult> UploadAccount(IFormFile? file) =>
        Run(async () =>
        {
            var accountId = AccountId();
            if (accountId <= 0) throw new UnauthorizedAccessException("unauthorized");
            return await Store(file, $"applications/{accountId}");
        });

    // News covers and product photos.
    [HttpPost("platform")]
    [RequestSizeLimit(MaxBytes + 8192)]
    public Task<IActionResult> UploadPlatform(IFormFile? file, [FromQuery] string? folder) =>
        Run(async () =>
        {
            if (!await _account.IsPlatformAdmin(AccountId()))
                throw new UnauthorizedAccessException("not_platform_admin");

            // Only a fixed set of folders: the value reaches the object key.
            var target = folder switch
            {
                "products" => "products",
                _ => "news",
            };
            return await Store(file, target);
        });
}
