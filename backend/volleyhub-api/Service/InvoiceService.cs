using System.Globalization;
using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Model;
using volleyhub_api.Service.Sms;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Service;

// Invoice texts to parents, and the workspace settings they print (training name, bank account).
// Texts go to the emergency contact's phone - for a child that is the parent - and fall back to
// the child's own phone. Every attempt is recorded in fee_notice, sent or not.
public class InvoiceService
{
    private readonly VolleyDbContext _db;
    private readonly AccountDbContext _accounts;
    private readonly ISmsSender _sms;
    private readonly volleyhub_api.Service.Mail.IEmailSender _mail;

    public InvoiceService(VolleyDbContext db, AccountDbContext accounts, ISmsSender sms, volleyhub_api.Service.Mail.IEmailSender mail)
    {
        _db = db;
        _accounts = accounts;
        _sms = sms;
        _mail = mail;
    }

    private static string? NullIfEmpty(string? s) => (s ?? string.Empty).Trim() is { Length: > 0 } v ? v : null;

    // ---- settings -----------------------------------------------------------

    public async Task<SettingsRT> Settings(int tenantId)
    {
        var t = await _accounts.tenant.AsNoTracking().FirstOrDefaultAsync(x => x.tenantid == tenantId)
            ?? throw new UnauthorizedAccessException("invalid_tenant");
        return new SettingsRT
        {
            tenantname = t.tenantname,
            contactphone = t.contactphone,
            bank_name = t.bank_name,
            bank_account = t.bank_account,
            bank_holder = t.bank_holder,
            sms_enabled = _sms.Enabled,
            email_enabled = _mail.Enabled,
        };
    }

    public async Task<SettingsRT> SaveSettings(int tenantId, SettingsBT data)
    {
        var name = (data.tenantname ?? string.Empty).Trim();
        if (name.Length == 0) throw new ArgumentException("training_name_required");

        var t = await _accounts.tenant.FirstOrDefaultAsync(x => x.tenantid == tenantId)
            ?? throw new UnauthorizedAccessException("invalid_tenant");
        t.tenantname = name;
        t.contactphone = NullIfEmpty(data.contactphone);
        t.bank_name = NullIfEmpty(data.bank_name);
        t.bank_account = NullIfEmpty(data.bank_account);
        t.bank_holder = NullIfEmpty(data.bank_holder);
        await _accounts.SaveChangesAsync();
        return await Settings(tenantId);
    }

    // ---- invoices -------------------------------------------------------------

    private static string Amount(decimal v) =>
        Math.Round(v).ToString("#,0", CultureInfo.InvariantCulture).Replace(",", "'");

    private static string Message(Tenant t, Student s, StudentFee f)
    {
        var month = int.Parse(f.period[5..]);
        var parts = new List<string>
        {
            $"{t.tenantname}: {s.first_name}-ийн {month}-р сарын сургалтын төлбөр {Amount(f.amount - f.paid_amount)}₮.",
        };
        if (!string.IsNullOrWhiteSpace(t.bank_account))
        {
            var bank = string.Join(" ", new[] { t.bank_name, t.bank_account }.Where(x => !string.IsNullOrWhiteSpace(x)));
            parts.Add(string.IsNullOrWhiteSpace(t.bank_holder) ? $"Данс: {bank}." : $"Данс: {bank}, {t.bank_holder}.");
        }
        parts.Add($"Гүйлгээний утга: {s.pay_ref ?? (s.first_name + " " + month + " сар")}.");
        parts.Add("Баярлалаа.");
        return string.Join(" ", parts);
    }

    public async Task<NotifyRT> Notify(int tenantId, NotifyBT data, int staffId)
    {
        var tenant = await _accounts.tenant.AsNoTracking().FirstOrDefaultAsync(x => x.tenantid == tenantId)
            ?? throw new UnauthorizedAccessException("invalid_tenant");

        var period = (data.period ?? string.Empty).Trim();
        if (period.Length != 7 || period[4] != '-') throw new ArgumentException("period_must_be_yyyy_mm");

        var query = _db.student_fee.AsNoTracking()
            .Where(f => !f.is_deleted && f.period == period && (f.status == 1 || f.status == 2));
        if (data.groupid is long gid) query = query.Where(f => f.groupid == gid);
        if (data.feeids is { Count: > 0 } ids) query = query.Where(f => ids.Contains(f.feeid));
        var fees = await query.ToListAsync();
        if (fees.Count == 0) throw new InvalidOperationException("nothing_to_notify");

        var studentIds = fees.Select(f => f.studentid).Distinct().ToList();
        var students = await _db.student.AsNoTracking()
            .Where(s => studentIds.Contains(s.studentid))
            .ToDictionaryAsync(s => s.studentid);

        var result = new NotifyRT { gateway = _sms.Enabled };
        var now = DateTime.UtcNow;

        foreach (var f in fees)
        {
            if (!students.TryGetValue(f.studentid, out var s)) continue;
            var phone = NullIfEmpty(s.emergency_phone) ?? NullIfEmpty(s.phone);
            var item = new NotifyItemRT
            {
                feeid = f.feeid,
                studentid = s.studentid,
                name = $"{s.last_name} {s.first_name}".Trim(),
                phone = phone,
                message = Message(tenant, s, f),
            };
            result.items.Add(item);

            if (phone == null)
            {
                item.status = "no_phone";
                result.skipped++;
                continue;
            }
            if (data.preview)
            {
                item.status = "preview";
                continue;
            }

            short status;
            if (_sms.Enabled)
            {
                var sent = await _sms.Send(phone, item.message);
                status = sent.Ok ? (short)1 : (short)2;
                item.status = sent.Ok ? "sent" : "failed";
                item.error = sent.Error;
                if (sent.Ok) result.sent++; else result.failed++;
            }
            else
            {
                // No gateway: keep the record so the coach can still see what would have gone out.
                status = 3;
                item.status = "logged";
            }

            _db.fee_notice.Add(new FeeNotice
            {
                feeid = f.feeid,
                studentid = s.studentid,
                phone = phone,
                message = item.message,
                status = status,
                error = item.error,
                staffid = staffId,
                created = now,
            });
        }

        if (!data.preview) await _db.SaveChangesAsync();
        return result;
    }

    public async Task<object> RecordManual(long feeId, ManualNoticeBT data, int staffId)
    {
        var fee = await _db.student_fee.AsNoTracking().FirstOrDefaultAsync(f => f.feeid == feeId && !f.is_deleted)
            ?? throw new InvalidOperationException("fee_not_found");
        _db.fee_notice.Add(new FeeNotice
        {
            feeid = fee.feeid,
            studentid = fee.studentid,
            phone = NullIfEmpty(data.phone) ?? "",
            message = data.message ?? "",
            status = 4,
            staffid = staffId,
            created = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
        return new { ok = true };
    }
}
