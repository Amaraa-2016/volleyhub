using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Model;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Service;

// Monthly fees and the payments against them. `paid_amount` and `status` on a fee are always
// recomputed from its payments, never written from a request - so a corrected or deleted payment
// can never leave a fee claiming to be settled.
public class BillingService
{
    private readonly VolleyDbContext _db;

    public BillingService(VolleyDbContext db)
    {
        _db = db;
    }

    // YYYY-MM. Validated rather than parsed loosely, because it is the key a monthly fee is unique on.
    private static string NormalisePeriod(string? period)
    {
        var value = (period ?? string.Empty).Trim();
        if (value.Length != 7 || value[4] != '-'
            || !int.TryParse(value[..4], out var year)
            || !int.TryParse(value[5..], out var month)
            || year is < 2000 or > 2100 || month is < 1 or > 12)
        {
            throw new ArgumentException("period_must_be_yyyy_mm");
        }
        return $"{year:D4}-{month:D2}";
    }

    private static void Recalculate(StudentFee fee, decimal paid)
    {
        fee.paid_amount = paid;
        // A waived fee stays waived: it is a decision, not a balance.
        if (fee.status == 4) return;
        fee.status = paid <= 0 ? (short)1 : paid < fee.amount ? (short)2 : (short)3;
    }

    private async Task RefreshFee(long feeId)
    {
        var fee = await _db.student_fee.FirstOrDefaultAsync(f => f.feeid == feeId && !f.is_deleted);
        if (fee == null) return;

        var paid = await _db.payment
            .Where(p => p.feeid == feeId && !p.is_deleted)
            .SumAsync(p => (decimal?)p.amount) ?? 0m;

        Recalculate(fee, paid);
        fee.updated = DateTime.UtcNow;
    }

    // ---- fees -------------------------------------------------------------

    public async Task<List<FeeRT>> Fees(long? groupId, long? studentId, string? period, short? status)
    {
        var query = _db.student_fee.AsNoTracking().Where(f => !f.is_deleted);
        if (groupId is long gid) query = query.Where(f => f.groupid == gid);
        if (studentId is long sid) query = query.Where(f => f.studentid == sid);
        if (!string.IsNullOrWhiteSpace(period)) query = query.Where(f => f.period == period);
        if (status is short st) query = query.Where(f => f.status == st);

        var fees = await query.OrderByDescending(f => f.period).ThenBy(f => f.studentid).ToListAsync();
        if (fees.Count == 0) return [];

        var studentIds = fees.Select(f => f.studentid).Distinct().ToList();
        var students = await _db.student.AsNoTracking()
            .Where(s => studentIds.Contains(s.studentid))
            .ToDictionaryAsync(s => s.studentid, s => new { s.last_name, s.first_name });
        var groups = await _db.training_group.AsNoTracking().ToDictionaryAsync(g => g.groupid, g => g.name);

        var feeIds = fees.Select(f => f.feeid).ToList();
        var payments = (await _db.payment.AsNoTracking()
                .Where(p => feeIds.Contains(p.feeid) && !p.is_deleted)
                .OrderByDescending(p => p.paid_at)
                .ToListAsync())
            .GroupBy(p => p.feeid)
            .ToDictionary(g => g.Key, g => g.Select(ToPaymentRT).ToList());

        return fees.Select(f => new FeeRT
        {
            feeid = f.feeid,
            studentid = f.studentid,
            last_name = students.TryGetValue(f.studentid, out var s) ? s.last_name : "",
            first_name = students.TryGetValue(f.studentid, out var s2) ? s2.first_name : "",
            groupid = f.groupid,
            groupname = groups.TryGetValue(f.groupid, out var gn) ? gn : "",
            period = f.period,
            amount = f.amount,
            paid_amount = f.paid_amount,
            balance = f.amount - f.paid_amount,
            due_date = f.due_date,
            status = f.status,
            note = f.note,
            payments = payments.TryGetValue(f.feeid, out var p) ? p : [],
        }).ToList();
    }

    public async Task<object> SaveFee(FeeBT data)
    {
        var period = NormalisePeriod(data.period);
        if (data.amount < 0) throw new ArgumentException("amount_cannot_be_negative");

        var now = DateTime.UtcNow;
        StudentFee fee;
        if (data.feeid > 0)
        {
            fee = await _db.student_fee.FirstOrDefaultAsync(f => f.feeid == data.feeid && !f.is_deleted)
                ?? throw new InvalidOperationException("fee_not_found");
        }
        else
        {
            _ = await _db.student.AsNoTracking()
                .FirstOrDefaultAsync(s => s.studentid == data.studentid && !s.is_deleted)
                ?? throw new InvalidOperationException("student_not_found");

            // One fee per student per group per month; anything else double-bills.
            var duplicate = await _db.student_fee.AnyAsync(f => !f.is_deleted
                && f.studentid == data.studentid && f.groupid == data.groupid && f.period == period);
            if (duplicate) throw new InvalidOperationException("fee_already_exists");

            fee = new StudentFee { created = now, studentid = data.studentid, groupid = data.groupid };
            _db.student_fee.Add(fee);
        }

        fee.period = period;
        fee.amount = data.amount;
        fee.due_date = data.due_date;
        fee.note = data.note;
        fee.updated = now;
        if (fee.status != 4) Recalculate(fee, fee.paid_amount);

        await _db.SaveChangesAsync();
        return new { fee.feeid };
    }

    // Bills every active student of a group (or of every group) for one month, at the price agreed
    // in their enrollment. Students who already have a fee for that period are skipped, so it is
    // safe to re-run after adding a student mid-month.
    public async Task<object> GenerateFees(GenerateFeesBT data)
    {
        var period = NormalisePeriod(data.period);

        var enrollments = await _db.enrollment.AsNoTracking()
            .Where(e => e.isactive && (data.groupid == null || e.groupid == data.groupid))
            .ToListAsync();
        if (enrollments.Count == 0) throw new InvalidOperationException("no_enrolled_students");

        var existing = (await _db.student_fee.AsNoTracking()
                .Where(f => !f.is_deleted && f.period == period)
                .Select(f => new { f.studentid, f.groupid })
                .ToListAsync())
            .Select(f => (f.studentid, f.groupid))
            .ToHashSet();

        var now = DateTime.UtcNow;
        var created = enrollments
            .Where(e => !existing.Contains((e.studentid, e.groupid)) && e.fee_amount > 0)
            .Select(e => new StudentFee
            {
                studentid = e.studentid,
                groupid = e.groupid,
                period = period,
                amount = e.fee_amount,
                paid_amount = 0,
                due_date = data.due_date,
                status = 1,
                created = now,
                updated = now,
            })
            .ToList();

        _db.student_fee.AddRange(created);
        await _db.SaveChangesAsync();
        return new { created = created.Count, skipped = enrollments.Count - created.Count };
    }

    public async Task<object> WaiveFee(long feeId, string? note)
    {
        var fee = await _db.student_fee.FirstOrDefaultAsync(f => f.feeid == feeId && !f.is_deleted)
            ?? throw new InvalidOperationException("fee_not_found");

        fee.status = 4;
        fee.note = note ?? fee.note;
        fee.updated = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    public async Task<object> DeleteFee(long feeId)
    {
        var fee = await _db.student_fee.FirstOrDefaultAsync(f => f.feeid == feeId && !f.is_deleted)
            ?? throw new InvalidOperationException("fee_not_found");

        if (await _db.payment.AnyAsync(p => p.feeid == feeId && !p.is_deleted))
            throw new InvalidOperationException("fee_has_payments");

        fee.is_deleted = true;
        fee.updated = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---- payments ---------------------------------------------------------

    public async Task<object> AddPayment(PaymentBT data, int staffId)
    {
        if (data.amount <= 0) throw new ArgumentException("amount_must_be_positive");

        var fee = await _db.student_fee.FirstOrDefaultAsync(f => f.feeid == data.feeid && !f.is_deleted)
            ?? throw new InvalidOperationException("fee_not_found");
        if (fee.status == 4) throw new InvalidOperationException("fee_is_waived");

        var alreadyPaid = await _db.payment
            .Where(p => p.feeid == fee.feeid && !p.is_deleted)
            .SumAsync(p => (decimal?)p.amount) ?? 0m;
        if (alreadyPaid + data.amount > fee.amount)
            throw new InvalidOperationException("payment_exceeds_fee");

        var now = DateTime.UtcNow;
        var payment = new Payment
        {
            feeid = fee.feeid,
            studentid = fee.studentid,
            amount = data.amount,
            method = data.method,
            paid_at = data.paid_at ?? now,
            received_by_staffid = staffId,
            note = data.note,
            created = now,
        };
        _db.payment.Add(payment);

        Recalculate(fee, alreadyPaid + data.amount);
        fee.updated = now;

        await _db.SaveChangesAsync();
        return new { payment.paymentid, fee.status, fee.paid_amount };
    }

    public async Task<object> DeletePayment(long paymentId)
    {
        var payment = await _db.payment.FirstOrDefaultAsync(p => p.paymentid == paymentId && !p.is_deleted)
            ?? throw new InvalidOperationException("payment_not_found");

        payment.is_deleted = true;
        await _db.SaveChangesAsync();

        // The fee has to follow the money, or it would keep claiming to be settled.
        await RefreshFee(payment.feeid);
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    public async Task<List<PaymentRT>> Payments(DateTime? from, DateTime? to)
    {
        var query = _db.payment.AsNoTracking().Where(p => !p.is_deleted);
        if (from is DateTime f) query = query.Where(p => p.paid_at >= f);
        if (to is DateTime t) query = query.Where(p => p.paid_at <= t);

        var rows = await query.OrderByDescending(p => p.paid_at).Take(500).ToListAsync();
        return rows.Select(ToPaymentRT).ToList();
    }

    private static PaymentRT ToPaymentRT(Payment p) => new()
    {
        paymentid = p.paymentid,
        feeid = p.feeid,
        studentid = p.studentid,
        amount = p.amount,
        method = p.method,
        paid_at = p.paid_at,
        note = p.note,
    };

    // ---- totals -----------------------------------------------------------

    public async Task<(decimal owed, int students)> Outstanding()
    {
        var rows = await _db.student_fee.AsNoTracking()
            .Where(f => !f.is_deleted && f.status != 3 && f.status != 4)
            .Select(f => new { f.studentid, owed = f.amount - f.paid_amount })
            .ToListAsync();

        return (rows.Sum(r => r.owed), rows.Select(r => r.studentid).Distinct().Count());
    }
}
