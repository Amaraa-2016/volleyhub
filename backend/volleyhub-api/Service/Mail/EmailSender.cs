using System.Net;
using System.Net.Mail;

namespace volleyhub_api.Service.Mail;

public record MailResult(bool Ok, string? Error);

public interface IEmailSender
{
    bool Enabled { get; }
    Task<MailResult> Send(IEnumerable<string> to, string subject, string html, string text, string? replyTo);
}

// Plain SMTP through System.Net.Mail - no extra package. Configured under "Email":
//   Host, Port (587), User, Password, From (address), FromName, Ssl (true)
// Gmail works with an app password (smtp.gmail.com:587); any provider with SMTP does.
// Blank Host disables sending; the app then offers the coach's own mail app instead.
public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IConfiguration config, ILogger<SmtpEmailSender> logger)
    {
        _config = config;
        _logger = logger;
    }

    private string Setting(string key) => _config[$"Email:{key}"] ?? "";

    public bool Enabled => Setting("Host").Length > 0 && Setting("From").Length > 0;

    public async Task<MailResult> Send(IEnumerable<string> to, string subject, string html, string text, string? replyTo)
    {
        if (!Enabled) return new MailResult(false, "email_not_configured");

        try
        {
            using var msg = new MailMessage
            {
                From = new MailAddress(Setting("From"), Setting("FromName").Length > 0 ? Setting("FromName") : "Volleyhub"),
                Subject = subject,
                SubjectEncoding = System.Text.Encoding.UTF8,
            };
            // Plain text first, HTML last: mail apps show the last alternative they understand.
            msg.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(text, System.Text.Encoding.UTF8, "text/plain"));
            msg.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(html, System.Text.Encoding.UTF8, "text/html"));
            foreach (var address in to) msg.To.Add(address);
            if (!string.IsNullOrWhiteSpace(replyTo)) msg.ReplyToList.Add(replyTo);

            using var client = new SmtpClient(Setting("Host"), int.TryParse(Setting("Port"), out var port) ? port : 587)
            {
                EnableSsl = !string.Equals(Setting("Ssl"), "false", StringComparison.OrdinalIgnoreCase),
                Credentials = Setting("User").Length > 0 ? new NetworkCredential(Setting("User"), Setting("Password")) : null,
                Timeout = 20000,
            };
            await client.SendMailAsync(msg);
            return new MailResult(true, null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Report email failed");
            var m = ex.InnerException?.Message ?? ex.Message;
            return new MailResult(false, m.Length > 300 ? m[..300] : m);
        }
    }
}
