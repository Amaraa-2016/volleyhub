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

    // 1=Serve, 2=Receive, 3=Set, 4=Attack, 5=Movement. Kept as a range rather than a table: the
    // list is part of the product, and the UI owns the names.
    private const short FirstSkill = 1;
    private const short LastSkill = 5;

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
        if (scores.Any(s => s.skill < FirstSkill || s.skill > LastSkill)) throw new ArgumentException("skill_out_of_range");
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
