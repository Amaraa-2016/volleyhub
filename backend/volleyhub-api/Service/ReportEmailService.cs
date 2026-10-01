using System.Globalization;
using System.Net;
using System.Text;
using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Model;
using volleyhub_api.Service.Mail;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Service;

// A child's report as an email: the same sections as the printed report, written as a simple
// HTML letter (inline styles only - mail apps strip everything else) with a plain-text twin.
// Every send is noted on the child's timeline, so the coach can see when parents were sent one.
public class ReportEmailService
{
    private readonly VolleyDbContext _db;
    private readonly AccountDbContext _accounts;
    private readonly IEmailSender _mail;

    private static readonly string[] AllSections = ["attendance", "progress", "measure", "fees", "health", "notes"];

    public ReportEmailService(VolleyDbContext db, AccountDbContext accounts, IEmailSender mail)
    {
        _db = db;
        _accounts = accounts;
        _mail = mail;
    }

    public bool Enabled => _mail.Enabled;

    private static string H(string? s) => WebUtility.HtmlEncode(s ?? "");
    private static string Money(decimal v) => Math.Round(v).ToString("#,0", CultureInfo.InvariantCulture).Replace(",", "'") + "₮";
    private static string D(DateTime d) => d.ToString("yyyy.MM.dd", CultureInfo.InvariantCulture);
    private static string Period(string p) => $"{p[..4]} оны {int.Parse(p[5..])}-р сар";

    private sealed class Doc
    {
        public readonly StringBuilder Html = new();
        public readonly StringBuilder Text = new();

        public void Heading(string title)
        {
            Html.Append($"<h2 style=\"margin:24px 0 8px;font-size:15px;color:#0f766e;border-bottom:2px solid #0f766e;padding-bottom:4px\">{H(title)}</h2>");
            Text.Append($"\n{title.ToUpperInvariant()}\n");
        }

        public void Para(string text, bool muted = false)
        {
            Html.Append($"<p style=\"margin:6px 0;{(muted ? "color:#56627a" : "")}\">{H(text)}</p>");
            Text.Append(text).Append('\n');
        }

        public void Table(string[] head, IEnumerable<string[]> rows)
        {
            Html.Append("<table style=\"border-collapse:collapse;width:100%;font-size:14px\"><tr>");
            foreach (var h in head) Html.Append($"<th style=\"text-align:left;color:#56627a;font-size:12px;border-bottom:1px solid #cfc7b8;padding:4px 6px\">{H(h)}</th>");
            Html.Append("</tr>");
            foreach (var r in rows)
            {
                Html.Append("<tr>");
                foreach (var c in r) Html.Append($"<td style=\"border-bottom:1px solid #ece6da;padding:4px 6px\">{H(c)}</td>");
                Html.Append("</tr>");
                Text.Append("  ").Append(string.Join(" | ", r.Where(c => c.Length > 0))).Append('\n');
            }
            Html.Append("</table>");
        }
    }

    public async Task<ReportEmailRT> Send(int accountId, long studentId, ReportEmailBT data, int staffId)
    {
        var coach = await _accounts.account.AsNoTracking().FirstOrDefaultAsync(t => t.accountid == accountId)
            ?? throw new UnauthorizedAccessException("account_not_found");
        var s = await _db.student.AsNoTracking().FirstOrDefaultAsync(x => x.studentid == studentId && !x.is_deleted)
            ?? throw new InvalidOperationException("student_not_found");

        var to = (data.to ?? new List<string>()).Select(e => (e ?? "").Trim().ToLowerInvariant()).Where(e => e.Length > 0).Distinct().ToList();
        if (!data.preview)
        {
            if (to.Count == 0) throw new ArgumentException("no_recipients");
            if (to.Any(e => !System.Text.RegularExpressions.Regex.IsMatch(e, @"^[^@\s]+@[^@\s]+\.[^@\s]+$")))
                throw new ArgumentException("email_invalid");
        }

        var sections = (data.sections ?? new List<string>()).Where(x => AllSections.Contains(x)).ToHashSet();
        if (sections.Count == 0) sections = new HashSet<string> { "attendance", "progress", "measure" };
        var since = data.from is DateTime f ? DateTime.SpecifyKind(f.Date, DateTimeKind.Utc) : DateTime.MinValue;
        var fromPeriod = data.from is DateTime fp ? $"{fp.Year:D4}-{fp.Month:D2}" : "0000-00";
        var name = $"{s.last_name} {s.first_name}".Trim();
        var range = data.from is DateTime r ? $"{D(r)} – {D(DateTime.UtcNow.AddHours(8))}" : "Бүх хугацаа";

        var doc = new Doc();
        doc.Html.Append("<div style=\"font-family:Arial,Helvetica,sans-serif;color:#17233a;max-width:640px;margin:0 auto;font-size:14px;line-height:20px\">");
        doc.Html.Append($"<div style=\"border-bottom:3px solid #c2410c;padding-bottom:10px\"><div style=\"color:#c2410c;font-weight:bold\">{H(AccountService.TrainingName(coach))}</div>"
            + $"<div style=\"font-size:22px;font-weight:bold;margin:4px 0\">{H(name)}</div><div style=\"color:#56627a\">Хүүхдийн хөгжлийн тайлан · {H(range)}</div></div>");
        doc.Text.Append($"{AccountService.TrainingName(coach)}\n{name} — хүүхдийн хөгжлийн тайлан ({range})\n");

        if (!string.IsNullOrWhiteSpace(data.message))
        {
            doc.Html.Append($"<p style=\"margin:16px 0;white-space:pre-wrap\">{H(data.message.Trim())}</p>");
            doc.Text.Append('\n').Append(data.message.Trim()).Append('\n');
        }

        if (sections.Contains("attendance"))
        {
            var rows = await (from a in _db.attendance_record.AsNoTracking()
                              join x in _db.training_session.AsNoTracking() on a.sessionid equals x.sessionid
                              where a.studentid == studentId && !x.is_deleted && x.status != 3 && x.session_date >= since
                              orderby x.session_date
                              select new { x.session_date, a.status, a.note }).ToListAsync();
            doc.Heading("Ирц");
            if (rows.Count == 0) doc.Para("Энэ хугацаанд ирц бүртгэгдээгүй.", true);
            else
            {
                int C(short st) => rows.Count(x => x.status == st);
                var counted = rows.Count - C(3);
                var rate = counted > 0 ? Math.Round((double)(C(1) + C(4)) / counted * 100) : 0;
                doc.Para($"Ирцийн хувь: {rate}% · {rows.Count} хичээл · ирсэн {C(1)}, хоцорсон {C(4)}, ирээгүй {C(2)}, чөлөөтэй {C(3)}");
                var missed = rows.Where(x => x.status is 2 or 3).ToList();
                if (missed.Count > 0)
                    doc.Table(["Огноо", "Төлөв", "Тэмдэглэл"],
                        missed.Select(x => new[] { D(x.session_date), x.status == 2 ? "Ирээгүй" : "Чөлөөтэй", x.note ?? "" }));
            }
        }

        if (sections.Contains("progress"))
        {
            var skills = await _db.skill.AsNoTracking().Where(k => !k.is_deleted).OrderBy(k => k.sort_order).ToListAsync();
            var ratings = await _db.skill_rating.AsNoTracking()
                .Where(x => x.studentid == studentId && string.Compare(x.period, fromPeriod) >= 0)
                .ToListAsync();
            doc.Heading("Ур чадварын үнэлгээ (1–5)");
            var periods = ratings.Select(x => x.period).Distinct().OrderBy(p => p).ToList();
            if (periods.Count == 0 || skills.Count == 0) doc.Para("Энэ хугацаанд үнэлгээ хийгдээгүй.", true);
            else
            {
                var shown = periods.TakeLast(4).ToList();
                doc.Table(new[] { "Ур чадвар" }.Concat(shown.Select(p => $"{int.Parse(p[5..])}/{p[2..4]}")).ToArray(),
                    skills.Select(k => new[] { k.name }.Concat(shown.Select(p =>
                        ratings.FirstOrDefault(x => x.period == p && x.skill == k.skillid)?.score.ToString() ?? "–")).ToArray()));
                var note = ratings.Where(x => x.period == periods.Last() && x.note != null).Select(x => x.note).FirstOrDefault();
                if (note != null) doc.Para($"Багшийн тэмдэглэл: {note}");
            }
        }

        if (sections.Contains("measure"))
        {
            var types = await _db.measure_type.AsNoTracking().Where(t => !t.is_deleted).OrderBy(t => t.sort_order).ToListAsync();
            var values = await _db.measurement.AsNoTracking()
                .Where(m => m.studentid == studentId && m.measured_on >= since).OrderBy(m => m.measured_on).ToListAsync();
            doc.Heading("Биеийн хөгжил");
            var rows = types.Select(t => (t, list: values.Where(v => v.typeid == t.typeid).ToList()))
                .Where(x => x.list.Count > 0)
                .Select(x =>
                {
                    var first = x.list.First(); var last = x.list.Last();
                    var change = x.list.Count > 1 ? last.value - first.value : 0;
                    return new[]
                    {
                        x.t.name, $"{last.value:0.#} {x.t.unit}".Trim(), D(last.measured_on),
                        x.list.Count > 1 ? $"{(change > 0 ? "+" : "")}{change:0.#} {x.t.unit} ({D(first.measured_on)}-с хойш)" : "",
                    };
                }).ToList();
            if (rows.Count == 0) doc.Para("Энэ хугацаанд хэмжилт алга.", true);
            else doc.Table(["Хэмжилт", "Сүүлийн", "Огноо", "Өөрчлөлт"], rows);
        }

        if (sections.Contains("fees"))
        {
            var fees = await _db.student_fee.AsNoTracking()
                .Where(x => x.studentid == studentId && !x.is_deleted && string.Compare(x.period, fromPeriod) >= 0)
                .OrderBy(x => x.period).ToListAsync();
            doc.Heading("Төлбөр");
            if (fees.Count == 0) doc.Para("Энэ хугацаанд төлбөр алга.", true);
            else
            {
                string St(short st) => st switch { 3 => "Төлсөн", 2 => "Дутуу", 4 => "Чөлөөлсөн", _ => "Төлөөгүй" };
                doc.Table(["Сар", "Дүн", "Төлсөн", "Төлөв"], fees.Select(x => new[] { Period(x.period), Money(x.amount), Money(x.paid_amount), St(x.status) }));
                var owed = fees.Where(x => x.status is 1 or 2).Sum(x => x.amount - x.paid_amount);
                doc.Para(owed > 0 ? $"Үлдэгдэл: {Money(owed)}" : "Төлбөрийн үлдэгдэлгүй.");
            }
        }

        if (sections.Contains("health"))
        {
            doc.Heading("Эрүүл мэнд");
            doc.Para($"Харшил: {s.allergies ?? "байхгүй"}");
            var injuries = await _db.injury.AsNoTracking()
                .Where(i => i.studentid == studentId && !i.is_deleted && (i.occurred_on >= since || i.status == 1))
                .OrderBy(i => i.occurred_on).ToListAsync();
            if (injuries.Count > 0)
                doc.Table(["Огноо", "Хаана", "Тайлбар", "Төлөв"], injuries.Select(i => new[]
                {
                    D(i.occurred_on), i.body_part ?? "", i.description, i.status == 2 ? "Эдгэрсэн" : "Эдгэрч байгаа",
                }));
        }

        if (sections.Contains("notes"))
        {
            var notes = await _db.student_note.AsNoTracking()
                .Where(n => n.studentid == studentId && !n.is_deleted && n.created >= since && !n.body.StartsWith("📧"))
                .OrderBy(n => n.created).ToListAsync();
            if (notes.Count > 0)
            {
                doc.Heading("Багшийн тэмдэглэл");
                foreach (var n in notes) doc.Para($"{D(n.created)}: {n.body}");
            }
        }

        var foot = string.Join(" · ", new[] { AccountService.TrainingName(coach), (coach.contactphone ?? coach.phone) }.Where(x => !string.IsNullOrWhiteSpace(x)));
        doc.Html.Append($"<p style=\"margin-top:28px;padding-top:10px;border-top:1px solid #e2dccf;color:#56627a;font-size:12px\">{H(foot)}</p></div>");
        doc.Text.Append($"\n—\n{foot}\n");

        var result = new ReportEmailRT
        {
            subject = $"{s.first_name} — хөгжлийн тайлан ({AccountService.TrainingName(coach)})",
            html = doc.Html.ToString(),
            text = doc.Text.ToString(),
        };
        if (data.preview) return result;

        var sent = await _mail.Send(to, result.subject, result.html, result.text, null);
        if (!sent.Ok) throw new InvalidOperationException(sent.Error == "email_not_configured" ? "email_not_configured" : "email_failed");

        // Leave a trace on the child's timeline.
        _db.student_note.Add(new StudentNote
        {
            studentid = studentId,
            body = $"📧 Тайлан имэйлээр илгээв: {string.Join(", ", to)}",
            staffid = staffId,
            created = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        result.sent = true;
        result.sent_to = to;
        return result;
    }
}
