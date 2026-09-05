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
    // Only to follow a Google share link far enough to read its coordinates - see MapLink.
    private readonly IHttpClientFactory _http;
    private readonly ILogger<TrainingService> _logger;

    public TrainingService(VolleyDbContext db, AccountDbContext accounts, ITenantProvider tenant,
        IHttpClientFactory http, ILogger<TrainingService> logger)
    {
        _db = db;
        _accounts = accounts;
        _tenant = tenant;
        _http = http;
        _logger = logger;
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

        // One pass for the whole page rather than a query per course.
        var coachesByGroup = (await (from gc in _db.group_coach.AsNoTracking()
                                     join c in _db.coach.AsNoTracking() on gc.coachid equals c.coachid
                                     where ids.Contains(gc.groupid) && !c.is_deleted
                                     orderby c.sort_order, c.last_name
                                     select new { gc.groupid, c })
                             .ToListAsync())
            .GroupBy(x => x.groupid)
            .ToDictionary(g => g.Key, g => g.Select(x => ToCoachRT(x.c, 0)).ToList());

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
            coaches = coachesByGroup.TryGetValue(g.groupid, out var gc) ? gc : [],
            venueid = g.venueid,
            venuename = g.venueid is long vid && venues.TryGetValue(vid, out var vname) ? vname : null,
            capacity = g.capacity,
            fee_amount = g.fee_amount,
            notes = g.notes,
            isactive = g.isactive,
            cover = g.cover,
            start_date = g.start_date,
            address = g.address,
            map_url = g.map_url,
            phone = g.phone,
            latitude = g.latitude,
            longitude = g.longitude,
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
        group.cover = NullIfEmpty(data.cover);
        group.start_date = data.start_date;
        group.address = NullIfEmpty(data.address);
        group.map_url = NullIfEmpty(data.map_url);
        group.phone = NullIfEmpty(data.phone);

        // Coordinates come from the pasted link so nobody has to type them. An explicit pair wins,
        // for the case where the link is unparseable and someone corrects the pin by hand.
        if (data.latitude is double lat && data.longitude is double lng)
        {
            group.latitude = lat;
            group.longitude = lng;
        }
        else
        {
            var found = await MapLink.Resolve(group.map_url, _http, _logger);
            group.latitude = found?.lat;
            group.longitude = found?.lng;
        }

        group.updated = now;

        await _db.SaveChangesAsync();
        await SetGroupCoaches(group.groupid, data.coachids);

        return new { group.groupid };
    }

    // The assignment is replaced wholesale: the form always posts the complete list, so diffing
    // rows one by one would only add ways for the two to drift apart.
    private async Task SetGroupCoaches(long groupId, List<long>? coachIds)
    {
        var wanted = (coachIds ?? []).Distinct().ToList();

        if (wanted.Count > 0)
        {
            // Ignore ids that are not real coaches of this centre rather than failing the save -
            // the course itself is already written by this point.
            var valid = await _db.coach.AsNoTracking()
                .Where(c => wanted.Contains(c.coachid) && !c.is_deleted)
                .Select(c => c.coachid)
                .ToListAsync();
            wanted = valid;
        }

        var existing = await _db.group_coach.Where(gc => gc.groupid == groupId).ToListAsync();

        _db.group_coach.RemoveRange(existing.Where(gc => !wanted.Contains(gc.coachid)));
        var already = existing.Select(gc => gc.coachid).ToHashSet();
        _db.group_coach.AddRange(wanted
            .Where(id => !already.Contains(id))
            .Select(id => new GroupCoach { groupid = groupId, coachid = id }));

        await _db.SaveChangesAsync();
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
        _db.group_coach.RemoveRange(await _db.group_coach.Where(gc => gc.groupid == groupId).ToListAsync());

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

    // ---- requests to join a course, from the public site --------------------

    public async Task<List<EnrollmentRequestRT>> EnrollmentRequests(short? status)
    {
        return await (from r in _db.enrollment_request.AsNoTracking()
                      join g in _db.training_group.AsNoTracking() on r.groupid equals g.groupid
                      where status == null || r.status == status
                      orderby r.created descending
                      select new EnrollmentRequestRT
                      {
                          requestid = r.requestid,
                          groupid = r.groupid,
                          groupname = g.name,
                          accountid = r.accountid,
                          last_name = r.last_name,
                          first_name = r.first_name,
                          phone = r.phone,
                          note = r.note,
                          status = r.status,
                          decision_note = r.decision_note,
                          studentid = r.studentid,
                          created = r.created,
                      }).ToListAsync();
    }

    // Approving is what turns an applicant into a student: it reuses the student row already on
    // file when the phone matches - a returning applicant must not become a second person - and
    // enrolls them at the course's standard price.
    public async Task<object> ApproveEnrollmentRequest(long requestId)
    {
        var request = await _db.enrollment_request
            .FirstOrDefaultAsync(r => r.requestid == requestId)
            ?? throw new InvalidOperationException("request_not_found");

        if (request.status == 2) return new { request.studentid };

        var now = DateTime.UtcNow;
        var phone = NullIfEmpty(request.phone);

        var student = phone == null
            ? null
            : await _db.student.FirstOrDefaultAsync(s => s.phone == phone && !s.is_deleted);

        if (student == null)
        {
            student = new Student
            {
                last_name = request.last_name,
                first_name = request.first_name,
                phone = phone,
                accountid = request.accountid,
                status = 1,
                created = now,
                updated = now,
            };
            _db.student.Add(student);
        }
        else if (student.accountid == 0)
        {
            // An existing student the centre typed in by hand, now claimed by a real login.
            student.accountid = request.accountid;
            student.updated = now;
        }

        await _db.SaveChangesAsync();

        await Enroll(request.groupid, new EnrollBT { studentid = student.studentid });

        request.status = 2;
        request.studentid = student.studentid;
        request.updated = now;
        await _db.SaveChangesAsync();

        return new { studentid = student.studentid };
    }

    public async Task<object> RejectEnrollmentRequest(long requestId, string? note)
    {
        var request = await _db.enrollment_request
            .FirstOrDefaultAsync(r => r.requestid == requestId)
            ?? throw new InvalidOperationException("request_not_found");

        request.status = 3;
        request.decision_note = NullIfEmpty(note);
        request.updated = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return new { request.requestid };
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

    // ---- coaches ----------------------------------------------------------

    public async Task<List<CoachRT>> Coaches(bool includeInactive = false)
    {
        var query = _db.coach.AsNoTracking().Where(c => !c.is_deleted);
        if (!includeInactive) query = query.Where(c => c.isactive);

        var coaches = await query.OrderBy(c => c.sort_order).ThenBy(c => c.last_name).ToListAsync();
        if (coaches.Count == 0) return [];

        var ids = coaches.Select(c => c.coachid).ToList();
        var counts = await _db.group_coach.AsNoTracking()
            .Where(gc => ids.Contains(gc.coachid))
            .GroupBy(gc => gc.coachid)
            .Select(g => new { coachid = g.Key, n = g.Count() })
            .ToDictionaryAsync(x => x.coachid, x => x.n);

        return coaches
            .Select(c => ToCoachRT(c, counts.TryGetValue(c.coachid, out var n) ? n : 0))
            .ToList();
    }

    public async Task<object> SaveCoach(CoachBT data)
    {
        if (Norm(data.first_name).Length == 0) throw new ArgumentException("first_name_required");

        var now = DateTime.UtcNow;
        Coach coach;
        if (data.coachid > 0)
        {
            coach = await _db.coach.FirstOrDefaultAsync(c => c.coachid == data.coachid && !c.is_deleted)
                ?? throw new InvalidOperationException("coach_not_found");
        }
        else
        {
            coach = new Coach { created = now };
            _db.coach.Add(coach);
        }

        coach.last_name = Norm(data.last_name);
        coach.first_name = Norm(data.first_name);
        coach.photo = NullIfEmpty(data.photo);
        coach.position = NullIfEmpty(data.position);
        coach.rank = NullIfEmpty(data.rank);
        coach.bio = data.bio;
        coach.phone = NullIfEmpty(data.phone);
        coach.isactive = data.isactive;
        coach.sort_order = data.sort_order;
        coach.updated = now;

        await _db.SaveChangesAsync();
        return new { coach.coachid };
    }

    public async Task<object> DeleteCoach(long coachId)
    {
        var coach = await _db.coach.FirstOrDefaultAsync(c => c.coachid == coachId && !c.is_deleted)
            ?? throw new InvalidOperationException("coach_not_found");

        coach.is_deleted = true;
        coach.isactive = false;
        coach.updated = DateTime.UtcNow;

        // Drop the assignments too: a deleted coach must stop appearing on a course page.
        _db.group_coach.RemoveRange(await _db.group_coach.Where(gc => gc.coachid == coachId).ToListAsync());

        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    private static CoachRT ToCoachRT(Coach c, int courseCount) => new()
    {
        coachid = c.coachid,
        last_name = c.last_name,
        first_name = c.first_name,
        photo = c.photo,
        position = c.position,
        rank = c.rank,
        bio = c.bio,
        phone = c.phone,
        isactive = c.isactive,
        sort_order = c.sort_order,
        coursecount = courseCount,
    };

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
