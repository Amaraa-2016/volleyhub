using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Model;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Service;

// The coach's monthly 1-5 scores per skill, and the "who keeps missing class" check the home
// screen shows. Both are for the coach's own eyes: nothing here is sent to a parent.
public class ProgressService
{
    private readonly VolleyDbContext _db;

    // What a new workspace starts with, in this order - see Skill for why the order matters.
    private static readonly (string name, string hint)[] DefaultSkills =
    [
        ("Давшилт", "Serve"),
        ("Хүлээн авалт", "Receive"),
        ("Дамжуулалт", "Set"),
        ("Цохилт", "Attack"),
        ("Хөдөлгөөн", "Movement"),
    ];

    public ProgressService(VolleyDbContext db)
    {
        _db = db;
    }

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

    // ---- criteria -------------------------------------------------------------

    public async Task<List<SkillRT>> Skills()
    {
        // Seeded once, only into a table that has never had a row - a coach who deleted every
        // criterion does not get the defaults back.
        if (!await _db.skill.AnyAsync())
        {
            var now = DateTime.UtcNow;
            var order = 0;
            foreach (var (name, hint) in DefaultSkills)
            {
                _db.skill.Add(new Skill { name = name, hint = hint, sort_order = ++order, created = now });
                // One at a time so the ids come out 1..5 in this order.
                await _db.SaveChangesAsync();
            }
        }

        return await _db.skill.AsNoTracking()
            .Where(k => !k.is_deleted)
            .OrderBy(k => k.sort_order).ThenBy(k => k.skillid)
            .Select(k => new SkillRT { skillid = k.skillid, name = k.name, hint = k.hint, sort_order = k.sort_order })
            .ToListAsync();
    }

    public async Task<object> SaveSkill(SkillBT data)
    {
        var name = (data.name ?? string.Empty).Trim();
        if (name.Length == 0) throw new ArgumentException("name_required");
        var hint = (data.hint ?? string.Empty).Trim() is { Length: > 0 } h ? h : null;

        Skill skill;
        if (data.skillid > 0)
        {
            skill = await _db.skill.FirstOrDefaultAsync(k => k.skillid == data.skillid && !k.is_deleted)
                ?? throw new InvalidOperationException("skill_not_found");
        }
        else
        {
            await Skills();
            var last = await _db.skill.Where(k => !k.is_deleted).MaxAsync(k => (int?)k.sort_order) ?? 0;
            skill = new Skill { created = DateTime.UtcNow, sort_order = last + 1 };
            _db.skill.Add(skill);
        }

        skill.name = name;
        skill.hint = hint;
        await _db.SaveChangesAsync();
        return new { skill.skillid };
    }

    public async Task<object> DeleteSkill(short skillId)
    {
        var skill = await _db.skill.FirstOrDefaultAsync(k => k.skillid == skillId && !k.is_deleted)
            ?? throw new InvalidOperationException("skill_not_found");
        skill.is_deleted = true;
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    public async Task<object> OrderSkills(SkillOrderBT data)
    {
        var skills = await _db.skill.Where(k => !k.is_deleted).ToListAsync();
        var order = 0;
        foreach (var id in data.skillids ?? [])
        {
            var k = skills.FirstOrDefault(x => x.skillid == id);
            if (k != null) k.sort_order = ++order;
        }
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // Every rated month of one child, newest first.
    public async Task<List<RatingMonthRT>> Ratings(long studentId)
    {
        var rows = await _db.skill_rating.AsNoTracking()
            .Where(r => r.studentid == studentId)
            .OrderByDescending(r => r.period)
            .ToListAsync();

        return rows.GroupBy(r => r.period)
            .Select(g => new RatingMonthRT
            {
                period = g.Key,
                scores = g.ToDictionary(r => r.skill, r => r.score),
                // The note is stored on every row of the month; any one of them carries it.
                note = g.Select(r => r.note).FirstOrDefault(n => n != null),
            })
            .ToList();
    }

    // Replaces the month's scores for the skills sent. A skill left out keeps its earlier score, so
    // rating just serve today does not wipe the rest.
    public async Task<object> SaveRatings(long studentId, RatingSaveBT data, int staffId)
    {
        var period = NormalisePeriod(data.period);

        _ = await _db.student.AsNoTracking()
            .FirstOrDefaultAsync(s => s.studentid == studentId && !s.is_deleted)
            ?? throw new InvalidOperationException("student_not_found");

        var scores = (data.scores ?? []).GroupBy(s => s.skill).Select(g => g.Last()).ToList();
        if (scores.Count == 0) throw new ArgumentException("no_scores");
        var known = (await Skills()).Select(k => k.skillid).ToHashSet();
        if (scores.Any(s => !known.Contains(s.skill))) throw new ArgumentException("skill_out_of_range");
        if (scores.Any(s => s.score is < 1 or > 5)) throw new ArgumentException("score_out_of_range");

        var existing = await _db.skill_rating
            .Where(r => r.studentid == studentId && r.period == period)
            .ToListAsync();

        var note = (data.note ?? string.Empty).Trim() is { Length: > 0 } n ? n : null;
        var now = DateTime.UtcNow;

        foreach (var s in scores)
        {
            var row = existing.FirstOrDefault(r => r.skill == s.skill);
            if (row == null)
            {
                row = new SkillRating { studentid = studentId, period = period, skill = s.skill };
                _db.skill_rating.Add(row);
                existing.Add(row);
            }
            row.score = s.score;
            row.rated_by_staffid = staffId;
            row.updated = now;
        }

        foreach (var row in existing) row.note = note;

        await _db.SaveChangesAsync();
        return new { ok = true, period };
    }

    // Children whose last `threshold` taken registers in their group all say absent. Only classes
    // whose attendance was actually taken count, so a coach who skipped the register one day does
    // not make the whole group look absent.
    public async Task<List<AbsentStreakRT>> AbsentStreaks(int threshold = 2)
    {
        var since = DateTime.UtcNow.Date.AddDays(-45);

        var sessions = await _db.training_session.AsNoTracking()
            .Where(s => !s.is_deleted && s.attendance_taken && s.session_date >= since)
            .Select(s => new { s.sessionid, s.groupid, s.session_date, s.start_minute })
            .ToListAsync();
        if (sessions.Count == 0) return [];

        var sessionIds = sessions.Select(s => s.sessionid).ToList();
        var marks = await _db.attendance_record.AsNoTracking()
            .Where(a => sessionIds.Contains(a.sessionid))
            .Select(a => new { a.sessionid, a.studentid, a.status })
            .ToListAsync();
        var byKey = marks.ToDictionary(m => (m.sessionid, m.studentid), m => m.status);

        var enrollments = await (from e in _db.enrollment.AsNoTracking()
                                 join st in _db.student.AsNoTracking() on e.studentid equals st.studentid
                                 join g in _db.training_group.AsNoTracking() on e.groupid equals g.groupid
                                 where e.isactive && !st.is_deleted && !g.is_deleted
                                 select new { e.groupid, st.studentid, st.last_name, st.first_name, g.name })
            .ToListAsync();

        var sessionsByGroup = sessions
            .GroupBy(s => s.groupid)
            .ToDictionary(g => g.Key, g => g
                .OrderByDescending(s => s.session_date).ThenByDescending(s => s.start_minute)
                .Select(s => s.sessionid)
                .ToList());

        var result = new List<AbsentStreakRT>();
        foreach (var e in enrollments)
        {
            if (!sessionsByGroup.TryGetValue(e.groupid, out var recent)) continue;

            var missed = 0;
            foreach (var sid in recent)
            {
                // No row means the child was not on the roster that day - stop counting there.
                if (!byKey.TryGetValue((sid, e.studentid), out var status)) break;
                if (status != 2) break;
                missed++;
            }

            if (missed >= threshold)
            {
                result.Add(new AbsentStreakRT
                {
                    studentid = e.studentid,
                    last_name = e.last_name,
                    first_name = e.first_name,
                    groupname = e.name,
                    missed = missed,
                });
            }
        }

        return result.OrderByDescending(r => r.missed).ThenBy(r => r.first_name).Take(10).ToList();
    }
}
