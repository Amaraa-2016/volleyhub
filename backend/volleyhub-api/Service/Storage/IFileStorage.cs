namespace volleyhub_api.Service.Storage;

public record StoredFile(string url, string key, long size);

public record StoredContent(Stream content, string contentType);

public interface IFileStorage
{
    // Stores one file and returns the URL a browser can open. Uploads run in-cluster, and the
    // returned URL points back at this API rather than at MinIO - see S3FileStorage for why.
    Task<StoredFile> Upload(Stream content, string fileName, string contentType, string folder, CancellationToken ct = default);

    // Reads an object back for the media endpoint to stream. Null when the key does not exist.
    Task<StoredContent?> Open(string key, CancellationToken ct = default);

    Task Delete(string keyOrUrl, CancellationToken ct = default);

    bool IsConfigured { get; }
}
