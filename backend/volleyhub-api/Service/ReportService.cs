using volleyhub_api.Data;
using volleyhub_api.DTO;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Service;

// The year's money in one read. Two views of "income" on purpose:
//   billed / paid   - by the month a fee is FOR (did September's children pay for September?)
//   collected       - by the month money ARRIVED (what went into the account in September)
// They differ whenever a parent pays late or early, and a coach needs both: the first to chase
// debts, the second to match the bank statement and file taxes.
public class ReportService
{
    private readonly VolleyDbContext _db;

    public ReportService(VolleyDbContext db)
    {
        _db = db;
    }

    public async Task<IncomeReportRT> Income(int year)
    {
        if (year is < 2000 or > 2100) throw new ArgumentException("year_out_of_range");
        var prefix = $"{year:D4}-";

        var fees = await _db.student_fee.AsNoTracking()
            .Where(f => !f.is_deleted && f.period.StartsWith(prefix))
            .Select(f => new { f.feeid, f.studentid, f.groupid, f.period, f.amount, f.base_amount, f.paid_amount, f.status })
            .ToListAsync();

        var from = new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var to = from.AddYears(1);
        var payments = await _db.payment.AsNoTracking()
            .Where(p => !p.is_deleted && p.paid_at >= from && p.paid_at < to)
            .Select(p => new { p.amount, p.method, p.paid_at })
            .ToListAsync();

        // A waived month is not income that went missing, so it counts as neither billed nor owed -
        // but what it would have cost does count as a discount given.
        decimal DiscountOf(decimal? baseAmount, decimal amount, short status) =>
            (baseAmount ?? amount) - (status == 4 ? 0 : amount);

        var report = new IncomeReportRT { year = year };

        for (var m = 1; m <= 12; m++)
        {
            var period = $"{year:D4}-{m:D2}";
            var month = fees.Where(f => f.period == period).ToList();
            var live = month.Where(f => f.status != 4).ToList();
            report.months.Add(new ReportMonthRT
            {
                period = period,
                billed = live.Sum(f => f.amount),
                paid = live.Sum(f => f.paid_amount),
                discounts = month.Sum(f => DiscountOf(f.base_amount, f.amount, f.status)),
                // Payments are stored in UTC; Mongolia is UTC+8, so shift before bucketing, or a
                // transfer at 7am on the 1st lands in the previous month.
                collected = payments.Where(p => p.paid_at.AddHours(8).Month == m && p.paid_at.AddHours(8).Year == year).Sum(p => p.amount),
                children = month.Select(f => f.studentid).Distinct().Count(),
            });
        }

        var liveFees = fees.Where(f => f.status != 4).ToList();
        report.billed = liveFees.Sum(f => f.amount);
        report.paid = liveFees.Sum(f => f.paid_amount);
        report.collected = report.months.Sum(x => x.collected);
        report.discounts = report.months.Sum(x => x.discounts);
        report.outstanding = report.billed - report.paid;

        var groups = await _db.training_group.AsNoTracking().ToDictionaryAsync(g => g.groupid, g => g.name);
        report.groups = liveFees.GroupBy(f => f.groupid)
            .Select(g => new ReportGroupRT
            {
                groupid = g.Key,
                name = groups.TryGetValue(g.Key, out var n) ? n : "—",
                billed = g.Sum(f => f.amount),
                paid = g.Sum(f => f.paid_amount),
            })
            .OrderByDescending(g => g.billed)
            .ToList();

        report.methods = payments.GroupBy(p => p.method).ToDictionary(g => g.Key, g => g.Sum(p => p.amount));

        // Who still owes for this year, largest first.
        var owing = liveFees.Where(f => f.amount > f.paid_amount).ToList();
        var studentIds = owing.Select(f => f.studentid).Distinct().ToList();
        var students = await _db.student.AsNoTracking()
            .Where(s => studentIds.Contains(s.studentid))
            .ToDictionaryAsync(s => s.studentid, s => (s.last_name + " " + s.first_name).Trim());
        report.debtors = owing.GroupBy(f => f.studentid)
            .Select(g => new ReportDebtorRT
            {
                studentid = g.Key,
                name = students.TryGetValue(g.Key, out var n) ? n : "—",
                groupname = groups.TryGetValue(g.OrderByDescending(f => f.period).First().groupid, out var gn) ? gn : null,
                owed = g.Sum(f => f.amount - f.paid_amount),
                months = g.Count(),
            })
            .OrderByDescending(d => d.owed)
            .ToList();

        return report;
    }
}
