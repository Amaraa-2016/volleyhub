using System.Globalization;
using System.Text.RegularExpressions;

namespace volleyhub_api.Service;

// Pulls coordinates out of a Google Maps link, so a centre never has to type latitude and longitude
// by hand - they paste the share link they already have and the pin places itself.
//
// Google writes the position into its URLs in several shapes depending on how the link was made,
// and a share link (maps.app.goo.gl) carries none of them until it is followed: it is a redirect to
// the long form. So a short link is resolved once, at save time, and only the resulting coordinates
// are stored - the map itself never depends on Google being reachable.
public static partial class MapLink
{
    // .../@47.9188,106.9176,15z/...  - the map centre, present in most desktop links
    [GeneratedRegex(@"@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)")]
    private static partial Regex AtPattern();

    // ...!3d47.9188!4d106.9176... - the marked place itself, which beats the map centre when both
    // are present because the centre can be offset by an open side panel
    [GeneratedRegex(@"!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)")]
    private static partial Regex PlacePattern();

    // ?q=47.9188,106.9176 / &query= / &ll= / &center=
    [GeneratedRegex(@"[?&](?:q|query|ll|center|daddr)=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)")]
    private static partial Regex QueryPattern();

    // A bare "47.9188, 106.9176" pasted straight into the field
    [GeneratedRegex(@"^\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$")]
    private static partial Regex BarePattern();

    private static (double lat, double lng)? Match(Regex pattern, string value)
    {
        var m = pattern.Match(value);
        if (!m.Success) return null;

        if (!double.TryParse(m.Groups[1].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var lat)) return null;
        if (!double.TryParse(m.Groups[2].Value, NumberStyles.Float, CultureInfo.InvariantCulture, out var lng)) return null;
        if (lat is < -90 or > 90 || lng is < -180 or > 180) return null;
        // 0,0 is in the Atlantic; it is what a failed parse looks like, never a training hall.
        if (lat == 0 && lng == 0) return null;

        return (lat, lng);
    }

    // Reads coordinates straight out of the text, without any network call.
    public static (double lat, double lng)? Parse(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;

        // The marked place first: it is the actual location, where @ is only where the camera sat.
        return Match(PlacePattern(), url)
            ?? Match(AtPattern(), url)
            ?? Match(QueryPattern(), url)
            ?? Match(BarePattern(), url);
    }

    private static bool IsShortLink(string url) =>
        url.Contains("maps.app.goo.gl", StringComparison.OrdinalIgnoreCase)
        || url.Contains("goo.gl/maps", StringComparison.OrdinalIgnoreCase);

    // Resolves a share link far enough to read its coordinates. Failure is not an error: the course
    // simply has no pin, and the link still works as a link.
    public static async Task<(double lat, double lng)?> Resolve(
        string? url, IHttpClientFactory factory, ILogger logger, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;

        var direct = Parse(url);
        if (direct != null || !IsShortLink(url)) return direct;

        try
        {
            var client = factory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(6);
            // A desktop user agent: Google answers a share link with a lightweight consent page for
            // some clients, and the long URL only appears in the redirect chain.
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

            using var response = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
            var final = response.RequestMessage?.RequestUri?.ToString();

            var fromUrl = Parse(final);
            if (fromUrl != null) return fromUrl;

            // Some redirects land on a page whose body carries the coordinates even though the URL
            // does not.
            var body = await response.Content.ReadAsStringAsync(ct);
            return Parse(body.Length > 200_000 ? body[..200_000] : body);
        }
        catch (Exception ex)
        {
            logger.LogInformation(ex, "Could not resolve map link {Url}", url);
            return null;
        }
    }
}
