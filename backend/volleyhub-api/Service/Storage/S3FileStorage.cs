using Amazon.S3;
using Amazon.S3.Model;

namespace volleyhub_api.Service.Storage;

// S3-compatible storage (MinIO in our cluster). Volleyhub runs its own MinIO rather than sharing
// another product's, so the bucket, credentials and lifecycle all belong to this platform.
//
// MinIO is NOT reachable from outside the cluster. Kindergarten can point a browser straight at
// MinIO because it has a domain, and its ingress serves s3.<domain> on 443 - a port that is open
// anyway. With no domain the equivalent is a second NodePort, which means another hole to get
// opened in a firewall (and 30900 was in fact closed, which is why uploads worked while images
// never displayed). So the stored URL points back at this API, which streams the object from the
// in-cluster address: one open port, nothing else exposed, and the same URLs keep working the day
// a domain is added.
//
// The trade is that image bytes pass through the API. At this size that is nothing, and the
// responses carry a long immutable cache header because every key is unique and never rewritten.
public class S3FileStorage : IFileStorage
{
    private readonly IAmazonS3? _client;
    private readonly string _bucket;
    private readonly string _mediaBaseUrl;
    private readonly ILogger<S3FileStorage> _logger;

    // Must match the route of PublicController.Media.
    public const string MediaPath = "/api/vh/public/media/";

    public bool IsConfigured => _client != null;

    public S3FileStorage(IConfiguration config, ILogger<S3FileStorage> logger)
    {
        _logger = logger;
        _bucket = config["Storage:Bucket"] ?? "";

        // Where a browser reaches this API. It ends up inside every stored image URL, so a wrong
        // value here produces images that upload fine and then fail to display.
        _mediaBaseUrl = (config["App:PublicBaseUrl"] ?? "").TrimEnd('/') + MediaPath;

        // Uploads go to the in-cluster endpoint when there is one.
        var internalUrl = config["Storage:InternalUrl"];
        var serviceUrl = config["Storage:ServiceUrl"] ?? "";
        var endpoint = string.IsNullOrWhiteSpace(internalUrl) ? serviceUrl : internalUrl;

        var accessKey = config["Storage:AccessKey"] ?? "";
        var secretKey = config["Storage:SecretKey"] ?? "";

        if (string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(_bucket)
            || string.IsNullOrWhiteSpace(accessKey) || string.IsNullOrWhiteSpace(secretKey))
        {
            // Storage is optional: without it the app still runs, uploads just refuse. That keeps a
            // local dev machine from needing MinIO to open a page.
            _logger.LogWarning("Storage is not configured - image upload is disabled");
            return;
        }

        var s3Config = new AmazonS3Config
        {
            ServiceURL = endpoint,
            // MinIO serves buckets as a path, not a subdomain.
            ForcePathStyle = true,
            AuthenticationRegion = config["Storage:Region"] ?? "us-east-1",
        };
        _client = new AmazonS3Client(accessKey, secretKey, s3Config);
    }

    public async Task<StoredFile> Upload(Stream content, string fileName, string contentType, string folder,
        CancellationToken ct = default)
    {
        if (_client == null) throw new InvalidOperationException("storage_not_configured");

        var extension = Path.GetExtension(fileName);
        if (extension.Length > 10) extension = "";
        // A random name: the original one may collide, carry someone's path, or be unprintable.
        var key = $"{folder.Trim('/')}/{DateTime.UtcNow:yyyyMM}/{Guid.NewGuid():N}{extension.ToLowerInvariant()}";

        // The stream has to be seekable and sized for the SDK to sign it, so buffer first. Uploads
        // are capped well below any memory concern by the controller.
        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, ct);
        buffer.Position = 0;

        // Read the size now: the SDK disposes the stream it was handed once the upload finishes, so
        // asking the buffer for its Length afterwards throws ObjectDisposedException - which reads
        // as a failed upload even though the object is already in the bucket.
        var size = buffer.Length;

        try
        {
            await _client.PutObjectAsync(new PutObjectRequest
            {
                BucketName = _bucket,
                Key = key,
                InputStream = buffer,
                ContentType = contentType,
                // MinIO does not accept the SDK's default aws-chunked payload encoding: it answers
                // 501, or fails the signature check, depending on the build. Turning it off sends
                // one ordinary signed PUT with a Content-Length, which is what MinIO expects.
                UseChunkEncoding = false,
            }, ct);
        }
        catch (AmazonS3Exception ex)
        {
            // The S3 error code is the whole diagnosis - NoSuchBucket, AccessDenied,
            // SignatureDoesNotMatch each mean something different - so carry it to the caller
            // instead of letting it collapse into a generic 500.
            _logger.LogError(ex, "Upload to {Bucket}/{Key} failed: {Code} {Status}",
                _bucket, key, ex.ErrorCode, ex.StatusCode);
            throw new InvalidOperationException($"storage_upload_failed|{ex.ErrorCode ?? ex.StatusCode.ToString()}");
        }
        catch (HttpRequestException ex)
        {
            // Wrong endpoint, MinIO not running, DNS - never reached the service at all.
            _logger.LogError(ex, "Could not reach storage at {Endpoint}", _client.Config.ServiceURL);
            throw new InvalidOperationException("storage_unreachable");
        }

        return new StoredFile($"{_mediaBaseUrl}{key}", key, size);
    }

    public async Task<StoredContent?> Open(string key, CancellationToken ct = default)
    {
        if (_client == null || string.IsNullOrWhiteSpace(key)) return null;

        try
        {
            var response = await _client.GetObjectAsync(_bucket, key, ct);
            return new StoredContent(response.ResponseStream,
                response.Headers.ContentType ?? "application/octet-stream");
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
        catch (AmazonS3Exception ex)
        {
            _logger.LogError(ex, "Read of {Bucket}/{Key} failed: {Code}", _bucket, key, ex.ErrorCode);
            return null;
        }
    }

    public async Task Delete(string keyOrUrl, CancellationToken ct = default)
    {
        if (_client == null || string.IsNullOrWhiteSpace(keyOrUrl)) return;

        var key = keyOrUrl;
        var index = key.IndexOf(MediaPath, StringComparison.OrdinalIgnoreCase);
        if (index >= 0) key = key[(index + MediaPath.Length)..];
        // A URL pointing somewhere else is not ours to delete.
        if (key.Contains("://")) return;

        try
        {
            await _client.DeleteObjectAsync(_bucket, key, ct);
        }
        catch (AmazonS3Exception ex)
        {
            // A missing object is the desired end state anyway; never fail the caller over cleanup.
            _logger.LogWarning(ex, "Could not delete {Key}", key);
        }
    }
}
