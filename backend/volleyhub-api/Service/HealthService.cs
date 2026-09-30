using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Model;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Service;

// Physical development (the coach's own measurement types and each child's values over time) and
// safety (injuries, plus the allergy and medical fields kept on the child).
public class HealthService
{
    private readonly VolleyDbContext _db;

    private static readonly (string name, string unit, bool higher)[] DefaultTypes =
    [
        ("Өндөр", "см", true),
        ("Жин", "кг", true),
        ("Үсрэлт", "см", true),
        ("20 м гүйлт", "сек", false),
    ];

    public HealthService(VolleyDbContext db)
    {
        _db = db;
    }

    private static string Norm(string? s) => (s ?? string.Empty).Trim();
    private static DateTime Day(DateTime d) => DateTime.SpecifyKind(d.Date, DateTimeKind.Utc);

    // ---- measurement types --------------------------------------------------------

    public async Task<List<MeasureTypeRT>> Types()
    {
        // Seeded once into a table that has never had a row, as with skills.
        if (!await _db.measure_type.AnyAsync())
        {
            var now = DateTime.UtcNow;
            var order = 0;
            foreach (var (name, unit, higher) in DefaultTypes)
                _db.measure_type.Add(new MeasureType { name = name, unit = unit, higher_is_better = higher, sort_order = ++order, created = now });
            await _db.SaveChangesAsync();
        }

        return await _db.measure_type.AsNoTracking()
            .Where(t => !t.is_deleted)
            .OrderBy(t => t.sort_order).ThenBy(t => t.typeid)
            .Select(t => new MeasureTypeRT
            {
                typeid = t.typeid, name = t.name, unit = t.unit, higher_is_better = t.higher_is_better, sort_order = t.sort_order,
            })
            .ToListAsync();
    }

    public async Task<object> SaveType(MeasureTypeBT data)
    {
        var name = Norm(data.name);
        if (name.Length == 0) throw new ArgumentException("name_required");

        MeasureType type;
        if (data.typeid > 0)
        {
            type = await _db.measure_type.FirstOrDefaultAsync(t => t.typeid == data.typeid && !t.is_deleted)
                ?? throw new InvalidOperationException("measure_type_not_found");
        }
        else
        {
            await Types();
            var last = await _db.measure_type.Where(t => !t.is_deleted).MaxAsync(t => (int?)t.sort_order) ?? 0;
            type = new MeasureType { created = DateTime.UtcNow, sort_order = last + 1 };
            _db.measure_type.Add(type);
        }

        type.name = name;
        type.unit = Norm(data.unit);
        type.higher_is_better = data.higher_is_better;
        await _db.SaveChangesAsync();
        return new { type.typeid };
    }

    public async Task<object> DeleteType(long typeId)
    {
        var type = await _db.measure_type.FirstOrDefaultAsync(t => t.typeid == typeId && !t.is_deleted)
            ?? throw new InvalidOperationException("measure_type_not_found");
        type.is_deleted = true;
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---- measurements ---------------------------------------------------------------

    public async Task<List<MeasurementRT>> Measurements(long studentId) =>
        await _db.measurement.AsNoTracking()
            .Where(m => m.studentid == studentId)
            .OrderBy(m => m.measured_on).ThenBy(m => m.measureid)
            .Select(m => new MeasurementRT { measureid = m.measureid, typeid = m.typeid, value = m.value, measured_on = m.measured_on, note = m.note })
            .ToListAsync();

    // A sitting: every value taken that day. Measuring the same thing twice on one day replaces it.
    public async Task<object> SaveMeasurements(long studentId, MeasureSaveBT data)
    {
        _ = await _db.student.AsNoTracking().FirstOrDefaultAsync(s => s.studentid == studentId && !s.is_deleted)
            ?? throw new InvalidOperationException("student_not_found");

        var values = (data.values ?? []).Where(v => v.value > 0).GroupBy(v => v.typeid).Select(g => g.Last()).ToList();
        if (values.Count == 0) throw new ArgumentException("no_values");

        var known = (await Types()).Select(t => t.typeid).ToHashSet();
        if (values.Any(v => !known.Contains(v.typeid))) throw new ArgumentException("measure_type_not_found");

        var day = Day(data.measured_on);
        if (day > DateTime.UtcNow.Date.AddDays(1)) throw new ArgumentException("date_in_future");

        var typeIds = values.Select(v => v.typeid).ToList();
        _db.measurement.RemoveRange(await _db.measurement
            .Where(m => m.studentid == studentId && m.measured_on == day && typeIds.Contains(m.typeid))
            .ToListAsync());

        var note = Norm(data.note) is { Length: > 0 } n ? n : null;
        var now = DateTime.UtcNow;
        foreach (var v in values)
        {
            _db.measurement.Add(new Measurement
            {
                studentid = studentId, typeid = v.typeid, value = v.value, measured_on = day, note = note, created = now,
            });
        }
        await _db.SaveChangesAsync();
        return new { ok = true, saved = values.Count };
    }

    public async Task<object> DeleteMeasurement(long studentId, long measureId)
    {
        var m = await _db.measurement.FirstOrDefaultAsync(x => x.measureid == measureId && x.studentid == studentId)
            ?? throw new InvalidOperationException("measurement_not_found");
        _db.measurement.Remove(m);
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---- injuries -------------------------------------------------------------

    public async Task<List<InjuryRT>> Injuries(long studentId) =>
        await _db.injury.AsNoTracking()
            .Where(i => i.studentid == studentId && !i.is_deleted)
            .OrderByDescending(i => i.occurred_on).ThenByDescending(i => i.injuryid)
            .Select(i => new InjuryRT
            {
                injuryid = i.injuryid, occurred_on = i.occurred_on, body_part = i.body_part, description = i.description,
                status = i.status, recovered_on = i.recovered_on, created = i.created,
            })
            .ToListAsync();

    public async Task<object> SaveInjury(long studentId, InjuryBT data, int staffId)
    {
        var description = Norm(data.description);
        if (description.Length == 0) throw new ArgumentException("description_required");
        if (data.status is not (1 or 2)) throw new ArgumentException("status_out_of_range");
        if (data.status == 2 && data.recovered_on != null && data.recovered_on.Value.Date < data.occurred_on.Date)
            throw new ArgumentException("recovered_before_injury");

        _ = await _db.student.AsNoTracking().FirstOrDefaultAsync(s => s.studentid == studentId && !s.is_deleted)
            ?? throw new InvalidOperationException("student_not_found");

        Injury injury;
        if (data.injuryid > 0)
        {
            injury = await _db.injury.FirstOrDefaultAsync(i => i.injuryid == data.injuryid && i.studentid == studentId && !i.is_deleted)
                ?? throw new InvalidOperationException("injury_not_found");
        }
        else
        {
            injury = new Injury { studentid = studentId, staffid = staffId, created = DateTime.UtcNow };
            _db.injury.Add(injury);
        }

        injury.occurred_on = Day(data.occurred_on);
        injury.body_part = Norm(data.body_part) is { Length: > 0 } b ? b : null;
        injury.description = description;
        injury.status = data.status;
        injury.recovered_on = data.status == 2 ? Day(data.recovered_on ?? DateTime.UtcNow) : null;

        await _db.SaveChangesAsync();
        return new { injury.injuryid };
    }

    public async Task<object> DeleteInjury(long studentId, long injuryId)
    {
        var injury = await _db.injury.FirstOrDefaultAsync(i => i.injuryid == injuryId && i.studentid == studentId && !i.is_deleted)
            ?? throw new InvalidOperationException("injury_not_found");
        injury.is_deleted = true;
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // Who needs care today: an allergy on file or an injury not yet healed. Read by the register,
    // the class list and the child list, so the warning travels with the name.
    public async Task<Dictionary<long, HealthFlagRT>> Flags(IEnumerable<long>? studentIds = null)
    {
        var ids = studentIds?.Distinct().ToList();

        var allergyQuery = _db.student.AsNoTracking().Where(s => !s.is_deleted && s.allergies != null && s.allergies != "");
        if (ids != null) allergyQuery = allergyQuery.Where(s => ids.Contains(s.studentid));
        var allergies = await allergyQuery.Select(s => new { s.studentid, s.allergies }).ToListAsync();

        var injuryQuery = _db.injury.AsNoTracking().Where(i => !i.is_deleted && i.status == 1);
        if (ids != null) injuryQuery = injuryQuery.Where(i => ids.Contains(i.studentid));
        var injuries = await injuryQuery.OrderByDescending(i => i.occurred_on)
            .Select(i => new { i.studentid, i.body_part, i.description }).ToListAsync();

        var result = new Dictionary<long, HealthFlagRT>();
        HealthFlagRT For(long id) => result.TryGetValue(id, out var f) ? f : result[id] = new HealthFlagRT { studentid = id };

        foreach (var a in allergies) For(a.studentid).allergies = a.allergies;
        foreach (var i in injuries)
        {
            var f = For(i.studentid);
            if (f.injured) continue;
            f.injured = true;
            f.injury = i.body_part ?? (i.description.Length > 40 ? i.description[..40] + "…" : i.description);
        }
        return result;
    }
}
