using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace volleyhub_api.Service.Sms;

public record SmsResult(bool Ok, string? Error);

public interface ISmsSender
{
    // False when no gateway is configured: messages are only recorded, never delivered.
    bool Enabled { get; }
    Task<SmsResult> Send(string phone, string text);
}

// Sends through whichever SMS gateway the operator configures under "Sms". Mongolian gateways
// differ, so the call is described by configuration rather than coded per provider:
//
//   Sms:Provider   "http" to send, anything else (default "log") to only record
//   Sms:Method     "GET" - Url is a template with {to} {text} {from} {key} placeholders, each
//                  URL-encoded (most local gateways: ...?key={key}&from={from}&to={to}&text={text})
//                  "POST" - Url receives JSON {"from","to","text"}
//   Sms:Url, Sms:ApiKey, Sms:From
//   Sms:AuthHeader optional header name that carries ApiKey on POST (e.g. "Authorization" is sent
//                  as "Bearer <key>", any other name gets the raw key)
//
// A 2xx answer counts as sent. Anything else is reported back with the gateway's own text so the
// coach sees why.
public class HttpSmsSender : ISmsSender
{
    private readonly IHttpClientFactory _http;
    private readonly IConfiguration _config;
    private readonly ILogger<HttpSmsSender> _logger;

    public HttpSmsSender(IHttpClientFactory http, IConfiguration config, ILogger<HttpSmsSender> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    private string Setting(string key) => _config[$"Sms:{key}"] ?? "";

    public bool Enabled =>
        Setting("Provider").Equals("http", StringComparison.OrdinalIgnoreCase) && Setting("Url").Length > 0;

    public async Task<SmsResult> Send(string phone, string text)
    {
        if (!Enabled)
        {
            _logger.LogInformation("SMS not sent (no gateway configured) to {Phone}: {Text}", phone, text);
            return new SmsResult(false, "gateway_not_configured");
        }

        var client = _http.CreateClient("sms");
        client.Timeout = TimeSpan.FromSeconds(15);

        try
        {
            HttpResponseMessage res;
            if (Setting("Method").Equals("POST", StringComparison.OrdinalIgnoreCase))
            {
                var req = new HttpRequestMessage(HttpMethod.Post, Setting("Url"))
                {
                    Content = new StringContent(
                        JsonSerializer.Serialize(new { from = Setting("From"), to = phone, text }),
                        Encoding.UTF8, "application/json"),
                };
                var header = Setting("AuthHeader");
                if (header.Length > 0)
                {
                    if (header.Equals("Authorization", StringComparison.OrdinalIgnoreCase))
                        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", Setting("ApiKey"));
                    else
                        req.Headers.TryAddWithoutValidation(header, Setting("ApiKey"));
                }
                res = await client.SendAsync(req);
            }
            else
            {
                var url = Setting("Url")
                    .Replace("{to}", Uri.EscapeDataString(phone))
                    .Replace("{text}", Uri.EscapeDataString(text))
                    .Replace("{from}", Uri.EscapeDataString(Setting("From")))
                    .Replace("{key}", Uri.EscapeDataString(Setting("ApiKey")));
                res = await client.GetAsync(url);
            }

            if (res.IsSuccessStatusCode) return new SmsResult(true, null);

            var body = await res.Content.ReadAsStringAsync();
            var error = $"{(int)res.StatusCode} {body}";
            return new SmsResult(false, error.Length > 300 ? error[..300] : error);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "SMS to {Phone} failed", phone);
            return new SmsResult(false, ex.Message.Length > 300 ? ex.Message[..300] : ex.Message);
        }
    }
}
