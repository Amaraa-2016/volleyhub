using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Model;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Service;

// The core of one coach's workspace: groups, the children in them, halls and the staff row. The
// schema is already resolved by the time VolleyDbContext is injected, so nothing here ever filters
// by tenant.
public class TrainingService
{
    private readonly VolleyDbContext _db;

    public TrainingService(VolleyDbContext db)
    {
        _db = db;
    }

    private static string Norm(string? s) => (s ?? string.Empty).Trim();
    private static string? NullIfEmpty(string? s) => Norm(s) is { Length: > 0 } v ? v : null;

    // ---- groups -----------------------------------------------------------

    public async Task<List<GroupRT>> Groups(bool includeInactive = false)
    {
        var query = _db.training_group.AsNoTracking().Where(g => !g.is_deleted);
        if (!includeInactive) query = query.Where(g => g.isactive);

        var groups = await query.OrderBy(g => g.name).ToListAsync();
        if (groups.Count == 0) return [];

        var ids = groups.Select(g => g.groupid).ToList();

        var counts = await _db.enrollment.AsNoTracking()
            .Where(e => ids.Contains(e.groupid) && e.isactive)
            .GroupBy(e => e.groupid)
            .Select(g => new { groupid = g.Key, count = g.Count() })
            .ToDictionaryAsync(x => x.groupid, x => x.count);

        var venues = await _db.venue.AsNoTracking().ToDictionaryAsync(v => v.venueid, v => v.name);

        var schedule = (await _db.schedule_entry.AsNoTracking()
                .Where(s => ids.Contains(s.groupid) && s.isactive)
                .OrderBy(s => s.weekday).ThenBy(s => s.start_minute)
                .ToListAsync())
            .GroupBy(s => s.groupid)
            .ToDictionary(g => g.Key, g => g.Select(s => new ScheduleEntryRT
            {
                scheduleid = s.scheduleid,
                groupid = s.groupid,
                venueid = s.venueid,
                venuename = s.venueid is long v && venues.TryGetValue(v, out var vn) ? vn : null,
                weekday = s.weekday,
                start_minute = s.start_minute,
                end_minute = s.end_minute,
                isactive = s.isactive,
            }).ToList());

        return groups.Select(g => new GroupRT
        {
            groupid = g.groupid,
            name = g.name,
            level = g.level,
            agegroup = g.agegroup,
            gender = g.gender,
            venueid = g.venueid,
            venuename = g.venueid is long vid && venues.TryGetValue(vid, out var vname) ? vname : null,
            capacity = g.capacity,
            fee_amount = g.fee_amount,
            notes = g.notes,
            isactive = g.isactive,
            studentcount = counts.TryGetValue(g.groupid, out var n) ? n : 0,
            schedule = schedule.TryGetValue(g.groupid, out var sch) ? sch : [],
        }).ToList();
    }

    public async Task<GroupRT> Group(long groupId)
    {
        var groups = await Groups(includeInactive: true);
        return groups.FirstOrDefault(g => g.groupid == groupId)
            ?? throw new InvalidOperationException("group_not_found");
    }

    public async Task<object> SaveGroup(GroupBT data)
    {
        if (Norm(data.name).Length == 0) throw new ArgumentException("name_required");
        if (data.fee_amount < 0) throw new ArgumentException("fee_cannot_be_negative");

        var now = DateTime.UtcNow;
        Group group;
        if (data.groupid > 0)
        {
            group = await _db.training_group.FirstOrDefaultAsync(g => g.groupid == data.groupid && !g.is_deleted)
                ?? throw new InvalidOperationException("group_not_found");
        }
        else
        {
            group = new Group { created = now };
            _db.training_group.Add(group);
        }

        group.name = Norm(data.name);
        group.level = NullIfEmpty(data.level);
        group.agegroup = NullIfEmpty(data.agegroup);
        group.gender = data.gender;
        group.venueid = data.venueid;
        group.capacity = data.capacity;
        group.fee_amount = data.fee_amount;
        group.notes = data.notes;
        group.isactive = data.isactive;
        group.updated = now;

        await _db.SaveChangesAsync();
        return new { group.groupid };
    }

    // A group with history behind it is archived rather than deleted, so past attendance and fees
    // keep resolving to a name.
    public async Task<object> DeleteGroup(long groupId)
    {
        var group = await _db.training_group.FirstOrDefaultAsync(g => g.groupid == groupId && !g.is_deleted)
            ?? throw new InvalidOperationException("group_not_found");

        var hasHistory = await _db.training_session.AnyAsync(s => s.groupid == groupId && !s.is_deleted)
            || await _db.student_fee.AnyAsync(f => f.groupid == groupId && !f.is_deleted);

        group.updated = DateTime.UtcNow;
        if (hasHistory)
        {
            group.isactive = false;
            await _db.SaveChangesAsync();
            return new { ok = true, archived = true };
        }

        group.is_deleted = true;
        group.isactive = false;

        _db.enrollment.RemoveRange(await _db.enrollment.Where(e => e.groupid == groupId).ToListAsync());
        _db.schedule_entry.RemoveRange(await _db.schedule_entry.Where(s => s.groupid == groupId).ToListAsync());

        await _db.SaveChangesAsync();
        return new { ok = true, archived = false };
    }

    // ---- enrollment -------------------------------------------------------

    public async Task<List<EnrollmentRT>> Roster(long groupId)
    {
        return await (from e in _db.enrollment.AsNoTracking()
                      join s in _db.student.AsNoTracking() on e.studentid equals s.studentid
                      where e.groupid == groupId && e.isactive && !s.is_deleted
                      orderby s.last_name, s.first_name
                      select new EnrollmentRT
                      {
                          enrollmentid = e.enrollmentid,
                          studentid = s.studentid,
                          last_name = s.last_name,
                          first_name = s.first_name,
                          phone = s.phone,
                          emergency_phone = s.emergency_phone,
                          date_of_birth = s.date_of_birth,
                          status = s.status,
                          fee_amount = e.fee_amount,
                          joined = e.joined,
                      }).ToListAsync();
    }

    public async Task<object> Enroll(long groupId, EnrollBT data)
    {
        var group = await _db.training_group.AsNoTracking()
            .FirstOrDefaultAsync(g => g.groupid == groupId && !g.is_deleted)
            ?? throw new InvalidOperationException("group_not_found");
        _ = await _db.student.AsNoTracking()
            .FirstOrDefaultAsync(s => s.studentid == data.studentid && !s.is_deleted)
            ?? throw new InvalidOperationException("student_not_found");

        var existing = await _db.enrollment
            .FirstOrDefaultAsync(e => e.groupid == groupId && e.studentid == data.studentid && e.isactive);

        if (existing == null && group.capacity > 0)
        {
            var enrolled = await _db.enrollment.CountAsync(e => e.groupid == groupId && e.isactive);
            if (enrolled >= group.capacity) throw new InvalidOperationException("group_full");
        }

        // The agreed price is fixed at enrollment: raising the group price later must not silently
        // change what an existing student is billed.
        var fee = data.fee_amount ?? group.fee_amount;

        if (existing != null)
        {
            existing.fee_amount = fee;
        }
        else
        {
            existing = new Enrollment
            {
                groupid = groupId,
                studentid = data.studentid,
                fee_amount = fee,
                joined = DateTime.UtcNow,
                isactive = true,
            };
            _db.enrollment.Add(existing);
        }

        await _db.SaveChangesAsync();
        return new { existing.enrollmentid };
    }

    public async Task<object> Unenroll(long groupId, long studentId)
    {
        var entry = await _db.enrollment
            .FirstOrDefaultAsync(e => e.groupid == groupId && e.studentid == studentId && e.isactive)
            ?? throw new InvalidOperationException("enrollment_not_found");

        entry.isactive = false;
        entry.left_at = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---- students ---------------------------------------------------------

    public async Task<List<StudentRT>> Students(long? groupId, string? search, bool unassignedOnly = false)
    {
        var term = Norm(search).ToLowerInvariant();

        var query = from s in _db.student.AsNoTracking()
                    where !s.is_deleted
                    join e in _db.enrollment.AsNoTracking().Where(x => x.isactive)
                        on s.studentid equals e.studentid into ge
                    from e in ge.DefaultIfEmpty()
                    join g in _db.training_group.AsNoTracking() on e.groupid equals g.groupid into gg
                    from g in gg.DefaultIfEmpty()
                    select new StudentRT
                    {
                        studentid = s.studentid,
                        accountid = s.accountid,
                        last_name = s.last_name,
                        first_name = s.first_name,
                        date_of_birth = s.date_of_birth,
                        gender = s.gender,
                        phone = s.phone,
                        emergency_name = s.emergency_name,
                        emergency_relation = s.emergency_relation,
                        emergency_phone = s.emergency_phone,
                        height_cm = s.height_cm,
                        photo = s.photo,
                        status = s.status,
                        notes = s.notes,
                        pay_ref = s.pay_ref,
                        groupid = g != null ? g.groupid : null,
                        groupname = g != null ? g.name : null,
                        fee_amount = e != null ? e.fee_amount : null,
                    };

        if (groupId is long gid) query = query.Where(s => s.groupid == gid);
        if (unassignedOnly) query = query.Where(s => s.groupid == null);
        if (term.Length > 0)
            query = query.Where(s => s.last_name.ToLower().Contains(term)
                || s.first_name.ToLower().Contains(term)
                || (s.phone != null && s.phone.Contains(term)));

        var rows = await query.OrderBy(s => s.last_name).ThenBy(s => s.first_name).ToListAsync();

        // One grouped pass for balances rather than a query per student.
        var balances = await _db.student_fee.AsNoTracking()
            .Where(f => !f.is_deleted && f.status != 4)
            .GroupBy(f => f.studentid)
            .Select(g => new { studentid = g.Key, owed = g.Sum(f => f.amount - f.paid_amount) })
            .ToDictionaryAsync(x => x.studentid, x => x.owed);

        foreach (var row in rows)
            row.balance = balances.TryGetValue(row.studentid, out var owed) ? owed : 0m;

        return rows;
    }

    public async Task<StudentRT> Student(long studentId)
    {
        var students = await Students(null, null);
        return students.FirstOrDefault(s => s.studentid == studentId)
            ?? throw new InvalidOperationException("student_not_found");
    }

    public async Task<object> SaveStudent(StudentBT data)
    {
        if (Norm(data.first_name).Length == 0) throw new ArgumentException("first_name_required");

        var now = DateTime.UtcNow;
        Student student;
        if (data.studentid > 0)
        {
            student = await _db.student.FirstOrDefaultAsync(s => s.studentid == data.studentid && !s.is_deleted)
                ?? throw new InvalidOperationException("student_not_found");
        }
        else
        {
            student = new Student { created = now };
            _db.student.Add(student);
        }

        student.last_name = Norm(data.last_name);
        student.first_name = Norm(data.first_name);
        student.date_of_birth = data.date_of_birth;
        student.gender = data.gender;
        student.phone = NullIfEmpty(data.phone);
        student.emergency_name = NullIfEmpty(data.emergency_name);
        student.emergency_relation = NullIfEmpty(data.emergency_relation);
        student.emergency_phone = NullIfEmpty(data.emergency_phone);
        student.height_cm = data.height_cm;
        student.photo = data.photo;
        student.status = data.status;
        student.notes = data.notes;
        student.pay_ref = NullIfEmpty(data.pay_ref);
        student.updated = now;

        await _db.SaveChangesAsync();

        // Adding a child from a group's page puts them straight into it.
        if (data.studentid == 0 && data.groupid is long gid)
            await Enroll(gid, new EnrollBT { studentid = student.studentid });

        return new { student.studentid };
    }

    public async Task<object> DeleteStudent(long studentId)
    {
        var student = await _db.student.FirstOrDefaultAsync(s => s.studentid == studentId && !s.is_deleted)
            ?? throw new InvalidOperationException("student_not_found");

        if (await _db.student_fee.AnyAsync(f => f.studentid == studentId && !f.is_deleted && f.status != 3 && f.status != 4))
            throw new InvalidOperationException("student_has_unpaid_fees");

        student.is_deleted = true;
        student.updated = DateTime.UtcNow;

        foreach (var entry in await _db.enrollment.Where(e => e.studentid == studentId && e.isactive).ToListAsync())
        {
            entry.isactive = false;
            entry.left_at = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---- venues -----------------------------------------------------------

    public Task<List<Venue>> Venues() =>
        _db.venue.AsNoTracking().Where(v => !v.is_deleted).OrderBy(v => v.name).ToListAsync();

    public async Task<object> SaveVenue(VenueBT data)
    {
        if (Norm(data.name).Length == 0) throw new ArgumentException("name_required");

        var now = DateTime.UtcNow;
        Venue venue;
        if (data.venueid > 0)
        {
            venue = await _db.venue.FirstOrDefaultAsync(v => v.venueid == data.venueid && !v.is_deleted)
                ?? throw new InvalidOperationException("venue_not_found");
        }
        else
        {
            venue = new Venue { created = now };
            _db.venue.Add(venue);
        }

        venue.name = Norm(data.name);
        venue.address = NullIfEmpty(data.address);
        venue.courts = data.courts < 1 ? 1 : data.courts;
        venue.contactphone = NullIfEmpty(data.contactphone);
        venue.notes = data.notes;
        venue.updated = now;

        await _db.SaveChangesAsync();
        return new { venue.venueid };
    }

    public async Task<object> DeleteVenue(long venueId)
    {
        var venue = await _db.venue.FirstOrDefaultAsync(v => v.venueid == venueId && !v.is_deleted)
            ?? throw new InvalidOperationException("venue_not_found");

        if (await _db.training_session.AnyAsync(s => s.venueid == venueId && !s.is_deleted))
            throw new InvalidOperationException("venue_in_use");

        venue.is_deleted = true;
        venue.updated = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---- staff ------------------------------------------------------------

    public Task<List<Staff>> StaffList() =>
        _db.staff.AsNoTracking().Where(s => s.isactive).OrderBy(s => s.staffname).ToListAsync();
}
