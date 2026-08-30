namespace volleyhub_api.Service.Storage;

public record StoredFile(string url, string key, long size);

public interface IFileStorage
{
    // Stores one file and returns the URL a browser can open. Uploads run in-cluster while the
    // returned URL uses the public endpoint, so the API never pays for a round trip through the
    // ingress and visitors still get a reachable address.
    Task<StoredFile> Upload(Stream content, string fileName, string contentType, string folder, CancellationToken ct = default);

    Task Delete(string keyOrUrl, CancellationToken ct = default);

    bool IsConfigured { get; }
}
