using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Model;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Service;

// The weekly timetable, the dated classes generated from it, and who turned up. Two levels on
// purpose: editing the timetable never rewrites history, and cancelling one class never touches
// the timetable.
public class ScheduleService
{
    private readonly VolleyDbContext _db;

    public ScheduleService(VolleyDbContext db)
    {
        _db = db;
    }

    private static void ValidateSlot(short weekday, int startMinute, int endMinute)
    {
        if (weekday is < 0 or > 6) throw new ArgumentException("weekday_out_of_range");
        if (startMinute is < 0 or >= 24 * 60) throw new ArgumentException("start_out_of_range");
        if (endMinute is < 0 or > 24 * 60) throw new ArgumentException("end_out_of_range");
        if (endMinute <= startMinute) throw new ArgumentException("end_before_start");
    }

    // ---- weekly timetable -------------------------------------------------

    public async Task<List<ScheduleEntryRT>> Schedule(long? groupId)
    {
        var query = _db.schedule_entry.AsNoTracking().AsQueryable();
        if (groupId is long gid) query = query.Where(s => s.groupid == gid);

        var entries = await query.OrderBy(s => s.weekday).ThenBy(s => s.start_minute).ToListAsync();
        var groups = await _db.training_group.AsNoTracking().ToDictionaryAsync(g => g.groupid, g => g.name);
        var venues = await _db.venue.AsNoTracking().ToDictionaryAsync(v => v.venueid, v => v.name);

        return entries.Select(s => new ScheduleEntryRT
        {
            scheduleid = s.scheduleid,
            groupid = s.groupid,
            groupname = groups.TryGetValue(s.groupid, out var gn) ? gn : null,
            venueid = s.venueid,
            venuename = s.venueid is long v && venues.TryGetValue(v, out var vn) ? vn : null,
            weekday = s.weekday,
            start_minute = s.start_minute,
            end_minute = s.end_minute,
            isactive = s.isactive,
        }).ToList();
    }

    public async Task<object> SaveScheduleEntry(ScheduleEntryBT data)
    {
        ValidateSlot(data.weekday, data.start_minute, data.end_minute);

        var group = await _db.training_group.AsNoTracking()
            .FirstOrDefaultAsync(g => g.groupid == data.groupid && !g.is_deleted)
            ?? throw new InvalidOperationException("group_not_found");

        var venueId = data.venueid ?? group.venueid;

        // Two groups cannot occupy the same hall at the same time. Only checked when a hall is
        // actually named - a slot with no hall is a plan, not a booking.
        if (venueId is long hall)
        {
            var clash = await _db.schedule_entry.AsNoTracking().AnyAsync(s =>
                s.scheduleid != data.scheduleid
                && s.isactive
                && s.venueid == hall
                && s.weekday == data.weekday
                && s.start_minute < data.end_minute
                && data.start_minute < s.end_minute);
            if (clash) throw new InvalidOperationException("venue_busy");
        }

        var now = DateTime.UtcNow;
        ScheduleEntry entry;
        if (data.scheduleid > 0)
        {
            entry = await _db.schedule_entry.FirstOrDefaultAsync(s => s.scheduleid == data.scheduleid)
                ?? throw new InvalidOperationException("schedule_not_found");
        }
        else
        {
            entry = new ScheduleEntry { created = now };
            _db.schedule_entry.Add(entry);
        }

        entry.groupid = data.groupid;
        entry.venueid = venueId;
        entry.weekday = data.weekday;
        entry.start_minute = data.start_minute;
        entry.end_minute = data.end_minute;
        entry.isactive = data.isactive;
        entry.updated = now;

        await _db.SaveChangesAsync();
        return new { entry.scheduleid };
    }

    public async Task<object> DeleteScheduleEntry(long scheduleId)
    {
        var entry = await _db.schedule_entry.FirstOrDefaultAsync(s => s.scheduleid == scheduleId)
            ?? throw new InvalidOperationException("schedule_not_found");

        // Removing a slot leaves the classes it already produced in place - they are history.
        _db.schedule_entry.Remove(entry);
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---- dated classes ----------------------------------------------------

    // Materialises the weekly timetable into dated classes. Skips any date/group/time that already
    // has one, so re-running never duplicates a class or disturbs attendance already taken.
    public async Task<object> GenerateSessions(GenerateSessionsBT data)
    {
        var from = data.from.Date;
        var to = data.to.Date;
        if (to < from) throw new ArgumentException("to_before_from");
        if ((to - from).TotalDays > 190) throw new ArgumentException("range_too_long");

        var slots = await _db.schedule_entry.AsNoTracking()
            .Where(s => s.isactive && (data.groupid == null || s.groupid == data.groupid))
            .ToListAsync();
        if (slots.Count == 0) throw new InvalidOperationException("no_schedule");

        var groupIds = slots.Select(s => s.groupid).Distinct().ToList();
        var coaches = await _db.training_group.AsNoTracking()
            .Where(g => groupIds.Contains(g.groupid))
            .ToDictionaryAsync(g => g.groupid, g => g.coach_staffid);

        var fromUtc = DateTime.SpecifyKind(from, DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(to, DateTimeKind.Utc);

        var existing = (await _db.training_session.AsNoTracking()
                .Where(s => !s.is_deleted && s.session_date >= fromUtc && s.session_date <= toUtc)
                .Select(s => new { s.groupid, s.session_date, s.start_minute })
                .ToListAsync())
            .Select(s => (s.groupid, s.session_date.Date, s.start_minute))
            .ToHashSet();

        var now = DateTime.UtcNow;
        var created = new List<TrainingSession>();

        for (var day = from; day <= to; day = day.AddDays(1))
        {
            var weekday = (short)day.DayOfWeek;
            foreach (var slot in slots.Where(s => s.weekday == weekday))
            {
                var key = (slot.groupid, day, slot.start_minute);
                if (!existing.Add(key)) continue;

                created.Add(new TrainingSession
                {
                    groupid = slot.groupid,
                    venueid = slot.venueid,
                    coach_staffid = coaches.TryGetValue(slot.groupid, out var coach) ? coach : null,
                    session_date = DateTime.SpecifyKind(day, DateTimeKind.Utc),
                    start_minute = slot.start_minute,
                    end_minute = slot.end_minute,
                    status = 1,
                    created = now,
                    updated = now,
                });
            }
        }

        _db.training_session.AddRange(created);
        await _db.SaveChangesAsync();
        return new { created = created.Count };
    }

    public async Task<List<SessionRT>> Sessions(long? groupId, DateTime? from, DateTime? to, short? status)
    {
        var query = _db.training_session.AsNoTracking().Where(s => !s.is_deleted);
        if (groupId is long gid) query = query.Where(s => s.groupid == gid);
        if (from is DateTime f) query = query.Where(s => s.session_date >= f.Date);
        if (to is DateTime t) query = query.Where(s => s.session_date <= t.Date);
        if (status is short st) query = query.Where(s => s.status == st);

        var sessions = await query
            .OrderBy(s => s.session_date).ThenBy(s => s.start_minute)
            .Take(500)
            .ToListAsync();

        return await Decorate(sessions);
    }

    public async Task<SessionRT> Session(long sessionId)
    {
        var session = await _db.training_session.AsNoTracking()
            .FirstOrDefaultAsync(s => s.sessionid == sessionId && !s.is_deleted)
            ?? throw new InvalidOperationException("session_not_found");
        return (await Decorate([session]))[0];
    }

    private async Task<List<SessionRT>> Decorate(List<TrainingSession> sessions)
    {
        if (sessions.Count == 0) return [];

        var groups = await _db.training_group.AsNoTracking().ToDictionaryAsync(g => g.groupid, g => g.name);
        var venues = await _db.venue.AsNoTracking().ToDictionaryAsync(v => v.venueid, v => v.name);
        var staff = await _db.staff.AsNoTracking().ToDictionaryAsync(s => s.staffid, s => s.staffname);

        var ids = sessions.Select(s => s.sessionid).ToList();
        var present = await _db.attendance_record.AsNoTracking()
            .Where(a => ids.Contains(a.sessionid) && (a.status == 1 || a.status == 4))
            .GroupBy(a => a.sessionid)
            .Select(g => new { sessionid = g.Key, n = g.Count() })
            .ToDictionaryAsync(x => x.sessionid, x => x.n);

        var groupIds = sessions.Select(s => s.groupid).Distinct().ToList();
        var enrolled = await _db.enrollment.AsNoTracking()
            .Where(e => groupIds.Contains(e.groupid) && e.isactive)
            .GroupBy(e => e.groupid)
            .Select(g => new { groupid = g.Key, n = g.Count() })
            .ToDictionaryAsync(x => x.groupid, x => x.n);

        return sessions.Select(s => new SessionRT
        {
            sessionid = s.sessionid,
            groupid = s.groupid,
            groupname = groups.TryGetValue(s.groupid, out var gn) ? gn : "?",
            venueid = s.venueid,
            venuename = s.venueid is long v && venues.TryGetValue(v, out var vn) ? vn : null,
            coach_staffid = s.coach_staffid,
            coachname = s.coach_staffid is int c && staff.TryGetValue(c, out var cn) ? cn : null,
            session_date = s.session_date,
            start_minute = s.start_minute,
            end_minute = s.end_minute,
            status = s.status,
            attendance_taken = s.attendance_taken,
            notes = s.notes,
            present_count = present.TryGetValue(s.sessionid, out var p) ? p : 0,
            student_count = enrolled.TryGetValue(s.groupid, out var e) ? e : 0,
        }).ToList();
    }

    public async Task<object> SaveSession(SessionBT data)
    {
        if (data.end_minute <= data.start_minute) throw new ArgumentException("end_before_start");
        _ = await _db.training_group.AsNoTracking()
            .FirstOrDefaultAsync(g => g.groupid == data.groupid && !g.is_deleted)
            ?? throw new InvalidOperationException("group_not_found");

        var now = DateTime.UtcNow;
        TrainingSession session;
        if (data.sessionid > 0)
        {
            session = await _db.training_session.FirstOrDefaultAsync(s => s.sessionid == data.sessionid && !s.is_deleted)
                ?? throw new InvalidOperationException("session_not_found");
        }
        else
        {
            session = new TrainingSession { created = now };
            _db.training_session.Add(session);
        }

        session.groupid = data.groupid;
        session.venueid = data.venueid;
        session.coach_staffid = data.coach_staffid;
        session.session_date = DateTime.SpecifyKind(data.session_date.Date, DateTimeKind.Utc);
        session.start_minute = data.start_minute;
        session.end_minute = data.end_minute;
        session.status = data.status;
        session.notes = data.notes;
        session.updated = now;

        await _db.SaveChangesAsync();
        return new { session.sessionid };
    }

    public async Task<object> DeleteSession(long sessionId)
    {
        var session = await _db.training_session.FirstOrDefaultAsync(s => s.sessionid == sessionId && !s.is_deleted)
            ?? throw new InvalidOperationException("session_not_found");

        if (session.attendance_taken) throw new InvalidOperationException("attendance_already_taken");

        session.is_deleted = true;
        session.updated = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---- attendance -------------------------------------------------------

    // The register of one class: every currently enrolled student, with whatever was marked before.
    public async Task<List<AttendanceRT>> Attendance(long sessionId)
    {
        var session = await _db.training_session.AsNoTracking()
            .FirstOrDefaultAsync(s => s.sessionid == sessionId && !s.is_deleted)
            ?? throw new InvalidOperationException("session_not_found");

        var roster = await (from e in _db.enrollment.AsNoTracking()
                            join s in _db.student.AsNoTracking() on e.studentid equals s.studentid
                            where e.groupid == session.groupid && e.isactive && !s.is_deleted
                            orderby s.last_name, s.first_name
                            select new { s.studentid, s.last_name, s.first_name }).ToListAsync();

        var marked = await _db.attendance_record.AsNoTracking()
            .Where(a => a.sessionid == sessionId)
            .ToDictionaryAsync(a => a.studentid, a => a);

        return roster.Select(r => new AttendanceRT
        {
            studentid = r.studentid,
            last_name = r.last_name,
            first_name = r.first_name,
            // Default to present: a coach marks the exceptions, which is how a register is used.
            status = marked.TryGetValue(r.studentid, out var m) ? m.status : (short)1,
            note = marked.TryGetValue(r.studentid, out var n) ? n.note : null,
        }).ToList();
    }

    // Replaces every record of the class in one go, so a correction is just a re-post.
    public async Task<object> SaveAttendance(long sessionId, AttendanceSaveBT data, int staffId)
    {
        var session = await _db.training_session.FirstOrDefaultAsync(s => s.sessionid == sessionId && !s.is_deleted)
            ?? throw new InvalidOperationException("session_not_found");
        if (session.status == 3) throw new InvalidOperationException("session_cancelled");

        var enrolled = await _db.enrollment.AsNoTracking()
            .Where(e => e.groupid == session.groupid && e.isactive)
            .Select(e => e.studentid)
            .ToHashSetAsync();

        var records = (data.records ?? []).Where(r => enrolled.Contains(r.studentid)).ToList();
        if (records.Count == 0) throw new ArgumentException("no_records");
        if (records.Any(r => r.status is < 1 or > 4)) throw new ArgumentException("status_out_of_range");

        var now = DateTime.UtcNow;
        _db.attendance_record.RemoveRange(await _db.attendance_record.Where(a => a.sessionid == sessionId).ToListAsync());
        _db.attendance_record.AddRange(records.Select(r => new AttendanceRecord
        {
            sessionid = sessionId,
            studentid = r.studentid,
            status = r.status,
            note = r.note,
            marked_by_staffid = staffId,
            marked_at = now,
        }));

        session.attendance_taken = true;
        // Taking the register is what says the class actually happened.
        if (session.status == 1) session.status = 2;
        session.updated = now;

        await _db.SaveChangesAsync();
        return new { ok = true, marked = records.Count };
    }

    // One student's attendance history, as the mobile app shows it.
    public async Task<AttendanceSummaryRT> StudentAttendance(long studentId, int take = 30)
    {
        var rows = await (from a in _db.attendance_record.AsNoTracking()
                          join s in _db.training_session.AsNoTracking() on a.sessionid equals s.sessionid
                          join g in _db.training_group.AsNoTracking() on s.groupid equals g.groupid
                          where a.studentid == studentId && !s.is_deleted
                          orderby s.session_date descending
                          select new AttendanceHistoryRT
                          {
                              sessionid = s.sessionid,
                              session_date = s.session_date,
                              groupname = g.name,
                              status = a.status,
                              note = a.note,
                          }).Take(take).ToListAsync();

        var all = await _db.attendance_record.AsNoTracking()
            .Where(a => a.studentid == studentId)
            .GroupBy(a => a.status)
            .Select(g => new { status = g.Key, n = g.Count() })
            .ToListAsync();

        int Count(short status) => all.FirstOrDefault(x => x.status == status)?.n ?? 0;

        var present = Count(1);
        var absent = Count(2);
        var excused = Count(3);
        var late = Count(4);
        var total = present + absent + excused + late;

        return new AttendanceSummaryRT
        {
            total = total,
            present = present,
            absent = absent,
            excused = excused,
            late = late,
            // Late still counts as having turned up; excused absences are left out of the
            // denominator so illness does not read as a bad attendance record.
            rate = total - excused > 0 ? Math.Round((double)(present + late) / (total - excused) * 100, 1) : 0,
            history = rows,
        };
    }
}
