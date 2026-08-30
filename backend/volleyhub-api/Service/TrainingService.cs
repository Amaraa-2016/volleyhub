using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Model;
using volleyhub_api.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Service;

// The core of one training centre: its groups, the students in them, halls, staff and
// announcements. The schema is already resolved by the time VolleyDbContext is injected, so nothing
// here ever filters by tenant.
public class TrainingService
{
    private readonly VolleyDbContext _db;
    // The public schema, needed only to link a student card to the login of the same person.
    private readonly AccountDbContext _accounts;
    private readonly ITenantProvider _tenant;

    public TrainingService(VolleyDbContext db, AccountDbContext accounts, ITenantProvider tenant)
    {
        _db = db;
        _accounts = accounts;
        _tenant = tenant;
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

        var coaches = await _db.staff.AsNoTracking().ToDictionaryAsync(s => s.staffid, s => s.staffname);
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
            coach_staffid = g.coach_staffid,
            coachname = g.coach_staffid is int c && coaches.TryGetValue(c, out var cn) ? cn : null,
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
        group.coach_staffid = data.coach_staffid;
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
                          parent_phone = s.parent_phone,
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
                        reg_no = s.reg_no,
                        phone = s.phone,
                        parent_name = s.parent_name,
                        parent_phone = s.parent_phone,
                        height_cm = s.height_cm,
                        photo = s.photo,
                        status = s.status,
                        notes = s.notes,
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
        student.reg_no = NullIfEmpty(data.reg_no);
        student.phone = NullIfEmpty(data.phone);
        student.parent_name = NullIfEmpty(data.parent_name);
        student.parent_phone = NullIfEmpty(data.parent_phone);
        student.height_cm = data.height_cm;
        student.photo = data.photo;
        student.status = data.status;
        student.notes = data.notes;
        student.updated = now;
        student.accountid = await FindAccountByPhone(student.phone);

        await _db.SaveChangesAsync();
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

    // Ties a student card to the account with the same phone, which is what lets the mobile app
    // show someone their own schedule. Only active members of this centre are considered, so a
    // phone that happens to exist elsewhere on the platform links nothing. Re-evaluated on every
    // save, so a card created before the student signed up picks them up on the next edit.
    private async Task<int> FindAccountByPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return 0;

        var tenantId = _tenant.GetTenantId();
        return await (from a in _accounts.account.AsNoTracking()
                      join m in _accounts.account_tenant.AsNoTracking() on a.accountid equals m.accountid
                      where a.phone == phone && m.tenantid == tenantId && m.status == "active"
                      select a.accountid).FirstOrDefaultAsync();
    }

    public async Task<StudentRT?> StudentByAccount(int accountId)
    {
        if (accountId <= 0) return null;
        var students = await Students(null, null);
        return students.FirstOrDefault(s => s.accountid == accountId);
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

    // ---- announcements ----------------------------------------------------

    public async Task<List<AnnouncementRT>> Announcements(bool publishedOnly)
    {
        var query = _db.announcement.AsNoTracking().Where(a => !a.is_deleted);
        if (publishedOnly) query = query.Where(a => a.published_at != null);

        var staff = await _db.staff.AsNoTracking().ToDictionaryAsync(s => s.staffid, s => s.staffname);
        var rows = await query.OrderByDescending(a => a.published_at ?? a.created).ToListAsync();

        return rows.Select(a => new AnnouncementRT
        {
            announcementid = a.announcementid,
            title = a.title,
            body = a.body,
            cover = a.cover,
            authorname = a.author_staffid is int sid && staff.TryGetValue(sid, out var sn) ? sn : null,
            published_at = a.published_at,
            created = a.created,
        }).ToList();
    }

    public async Task<object> SaveAnnouncement(AnnouncementBT data, int staffId)
    {
        if (Norm(data.title).Length == 0) throw new ArgumentException("title_required");

        var now = DateTime.UtcNow;
        Announcement post;
        if (data.announcementid > 0)
        {
            post = await _db.announcement.FirstOrDefaultAsync(a => a.announcementid == data.announcementid && !a.is_deleted)
                ?? throw new InvalidOperationException("announcement_not_found");
        }
        else
        {
            post = new Announcement { created = now, author_staffid = staffId > 0 ? staffId : null };
            _db.announcement.Add(post);
        }

        post.title = Norm(data.title);
        post.body = data.body;
        post.cover = data.cover;
        // Publishing stamps the time once; unpublishing clears it, so a re-publish reads as new.
        post.published_at = data.publish ? post.published_at ?? now : null;
        post.updated = now;

        await _db.SaveChangesAsync();
        return new { post.announcementid };
    }

    public async Task<object> DeleteAnnouncement(long announcementId)
    {
        var post = await _db.announcement.FirstOrDefaultAsync(a => a.announcementid == announcementId && !a.is_deleted)
            ?? throw new InvalidOperationException("announcement_not_found");

        post.is_deleted = true;
        post.updated = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---- staff ------------------------------------------------------------

    public Task<List<Staff>> StaffList() =>
        _db.staff.AsNoTracking().Where(s => s.isactive).OrderBy(s => s.staffname).ToListAsync();
}
