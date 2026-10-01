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

    // Lower-cased and checked loosely: something@something.something. Anything stricter rejects
    // real addresses; the mail server is the final judge.
    private static string? Email(string? s)
    {
        var v = Norm(s).ToLowerInvariant();
        if (v.Length == 0) return null;
        if (v.Length > 200 || !System.Text.RegularExpressions.Regex.IsMatch(v, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
            throw new ArgumentException("email_invalid");
        return v;
    }

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
        // The fee belongs to the class: changing it moves every child currently in the class to the
        // new price from the next month's invoice. Months already billed keep their amount.
        var repriced = data.groupid > 0 && group.fee_amount != data.fee_amount;
        group.fee_amount = data.fee_amount;
        group.notes = data.notes;
        group.isactive = data.isactive;
        group.updated = now;

        if (repriced)
        {
            foreach (var e in await _db.enrollment.Where(e => e.groupid == group.groupid && e.isactive).ToListAsync())
                e.fee_amount = data.fee_amount;
        }

        await _db.SaveChangesAsync();
        return new { group.groupid };
    }

    // Deleting a class. It is only ever hidden (is_deleted), never removed, so attendance and fees
    // already recorded keep showing the class name. What goes with it:
    //   - the children's places in it close today; the children themselves stay, and anyone with
    //     no other class shows as "Ангигүй" until moved;
    //   - the weekly timetable, and future classes nobody has taken the register for;
    //   - nothing about money: fees already billed, paid or not, stay as they are.
    public async Task<object> DeleteGroup(long groupId)
    {
        var group = await _db.training_group.FirstOrDefaultAsync(g => g.groupid == groupId && !g.is_deleted)
            ?? throw new InvalidOperationException("group_not_found");

        var now = DateTime.UtcNow;
        var today = DateTime.SpecifyKind(now.Date, DateTimeKind.Utc);

        group.is_deleted = true;
        group.isactive = false;
        group.updated = now;

        var open = await _db.enrollment.Where(e => e.groupid == groupId && e.isactive).ToListAsync();
        foreach (var e in open)
        {
            e.isactive = false;
            e.left_at = today;
        }

        foreach (var slot in await _db.schedule_entry.Where(x => x.groupid == groupId && x.isactive).ToListAsync())
        {
            slot.isactive = false;
            slot.updated = now;
        }

        var future = await _db.training_session
            .Where(x => x.groupid == groupId && !x.is_deleted && !x.attendance_taken && x.session_date >= today)
            .ToListAsync();
        foreach (var session in future)
        {
            session.is_deleted = true;
            session.updated = now;
        }

        await _db.SaveChangesAsync();
        return new { ok = true, children = open.Count, sessions = future.Count };
    }

    // ---- enrollment -------------------------------------------------------

    // Everyone in the class: active children, and - when asked - the ones who have left, so the
    // class page can still open their history. A child who merely moved to another class is not
    // "left" and does not show here.
    public async Task<List<EnrollmentRT>> Roster(long groupId, bool includeLeft = false)
    {
        var rows = await (from e in _db.enrollment.AsNoTracking()
                          join s in _db.student.AsNoTracking() on e.studentid equals s.studentid
                          where e.groupid == groupId && !s.is_deleted
                          select new { e, s }).ToListAsync();

        var ids = rows.Select(r => r.s.studentid).Distinct().ToList();
        var balances = await Balances(ids);

        return rows
            .GroupBy(r => r.s.studentid)
            .Select(g => g.Where(r => r.e.isactive).OrderBy(r => r.e.joined).FirstOrDefault()
                ?? g.OrderByDescending(r => r.e.left_at ?? r.e.joined).First())
            .Where(r => r.e.isactive || (includeLeft && r.s.status == 3))
            .OrderBy(r => r.e.isactive ? 0 : 1).ThenBy(r => r.s.last_name).ThenBy(r => r.s.first_name)
            .Select(r => new EnrollmentRT
            {
                enrollmentid = r.e.enrollmentid,
                studentid = r.s.studentid,
                last_name = r.s.last_name,
                first_name = r.s.first_name,
                gender = r.s.gender,
                birth_year = r.s.birth_year,
                phone = r.s.phone,
                emergency_name = r.s.emergency_name,
                emergency_relation = r.s.emergency_relation,
                emergency_phone = r.s.emergency_phone,
                emergency_email = r.s.emergency_email,
                email = r.s.email,
                date_of_birth = r.s.date_of_birth,
                status = r.s.status,
                fee_amount = r.e.fee_amount,
                joined = r.e.joined,
                left_at = r.e.left_at,
                active = r.e.isactive,
                balance = balances.TryGetValue(r.s.studentid, out var owed) ? owed : 0m,
            })
            .ToList();
    }

    private async Task<Dictionary<long, decimal>> Balances(List<long>? studentIds = null)
    {
        var query = _db.student_fee.AsNoTracking().Where(f => !f.is_deleted && f.status != 4);
        if (studentIds != null) query = query.Where(f => studentIds.Contains(f.studentid));
        return await query
            .GroupBy(f => f.studentid)
            .Select(g => new { studentid = g.Key, owed = g.Sum(f => f.amount - f.paid_amount) })
            .ToDictionaryAsync(x => x.studentid, x => x.owed);
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

    // One row per child, with the class they are in now - or, for a child who has left, the class
    // they left from. Built in memory: a coach has dozens of children, not thousands, and picking
    // "the" enrollment per child is far clearer here than in SQL.
    public async Task<List<StudentRT>> Students(long? groupId, string? search, bool unassignedOnly = false)
    {
        var term = Norm(search).ToLowerInvariant();

        var students = await _db.student.AsNoTracking().Where(s => !s.is_deleted).ToListAsync();
        var byStudent = (await _db.enrollment.AsNoTracking().ToListAsync())
            .GroupBy(e => e.studentid)
            .ToDictionary(g => g.Key, g => g.ToList());
        var groups = await _db.training_group.AsNoTracking().ToDictionaryAsync(g => g.groupid, g => g.name);
        var balances = await Balances();
        var discountNames = await _db.discount.AsNoTracking().Where(d => !d.is_deleted).ToDictionaryAsync(d => d.discountid, d => d.name);

        static Enrollment? Pick(List<Enrollment> list, long? gid)
        {
            var pool = gid is long g ? list.Where(e => e.groupid == g).ToList() : list;
            return pool.Where(e => e.isactive).OrderBy(e => e.joined).FirstOrDefault()
                ?? pool.OrderByDescending(e => e.left_at ?? e.joined).FirstOrDefault();
        }

        var rows = new List<StudentRT>();
        foreach (var s in students)
        {
            var list = byStudent.TryGetValue(s.studentid, out var l) ? l : new List<Enrollment>();
            var e = Pick(list, groupId);

            if (groupId != null && (e == null || (!e.isactive && s.status != 3))) continue;
            if (unassignedOnly && list.Any(x => x.isactive)) continue;
            if (term.Length > 0 && !(s.last_name.ToLower().Contains(term)
                    || s.first_name.ToLower().Contains(term)
                    || (s.phone ?? "").Contains(term)
                    || (s.emergency_phone ?? "").Contains(term)
                    || (s.pay_ref ?? "").ToLower().Contains(term)))
                continue;

            rows.Add(new StudentRT
            {
                studentid = s.studentid,
                accountid = s.accountid,
                last_name = s.last_name,
                first_name = s.first_name,
                date_of_birth = s.date_of_birth,
                birth_year = s.birth_year,
                gender = s.gender,
                phone = s.phone,
                emergency_name = s.emergency_name,
                emergency_relation = s.emergency_relation,
                emergency_phone = s.emergency_phone,
                emergency_email = s.emergency_email,
                email = s.email,
                height_cm = s.height_cm,
                photo = s.photo,
                status = s.status,
                start_date = s.start_date,
                left_date = s.left_date,
                notes = s.notes,
                pay_ref = s.pay_ref,
                discountid = s.discountid,
                discountname = s.discountid is long did && discountNames.TryGetValue(did, out var dn) ? dn : null,
                allergies = s.allergies,
                medical_notes = s.medical_notes,
                blood_type = s.blood_type,
                groupid = e?.groupid,
                groupname = e != null && groups.TryGetValue(e.groupid, out var gn) ? gn : null,
                fee_amount = e?.fee_amount,
                balance = balances.TryGetValue(s.studentid, out var owed) ? owed : 0m,
            });
        }

        return rows
            .OrderBy(r => r.status == 3 ? 1 : 0)
            .ThenBy(r => r.last_name).ThenBy(r => r.first_name)
            .ToList();
    }

    public async Task<StudentRT> Student(long studentId)
    {
        var students = await Students(null, null);
        return students.FirstOrDefault(s => s.studentid == studentId)
            ?? throw new InvalidOperationException("student_not_found");
    }

    private static DateTime? Day(DateTime? d) =>
        d is DateTime v ? DateTime.SpecifyKind(v.Date, DateTimeKind.Utc) : null;

    // The child form, saved from a class page. Besides the child's own fields it keeps the class
    // enrollment in step with the status: leaving closes every open enrollment on left_date, and
    // coming back (or a new child) opens one in the class the form came from.
    public async Task<object> SaveStudent(StudentBT data)
    {
        if (Norm(data.first_name).Length == 0) throw new ArgumentException("first_name_required");
        if (data.status is not (1 or 2 or 3)) throw new ArgumentException("status_out_of_range");
        if (data.status == 3 && data.left_date == null) throw new ArgumentException("left_date_required");
        if (data.left_date != null && data.start_date != null && data.left_date.Value.Date < data.start_date.Value.Date)
            throw new ArgumentException("left_before_start");
        if (data.birth_year is int by && (by < 1950 || by > DateTime.UtcNow.Year))
            throw new ArgumentException("birth_year_out_of_range");
        if (data.fee_amount < 0) throw new ArgumentException("fee_cannot_be_negative");

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

        Group? group = null;
        if (data.groupid is long gid)
        {
            group = await _db.training_group.AsNoTracking().FirstOrDefaultAsync(g => g.groupid == gid && !g.is_deleted)
                ?? throw new InvalidOperationException("group_not_found");
        }

        student.last_name = Norm(data.last_name);
        student.first_name = Norm(data.first_name);
        student.date_of_birth = data.date_of_birth;
        student.birth_year = data.birth_year;
        student.gender = data.gender;
        student.phone = NullIfEmpty(data.phone);
        student.emergency_name = NullIfEmpty(data.emergency_name);
        student.emergency_relation = NullIfEmpty(data.emergency_relation);
        student.emergency_phone = NullIfEmpty(data.emergency_phone);
        student.emergency_email = Email(data.emergency_email);
        student.email = Email(data.email);
        student.height_cm = data.height_cm;
        student.photo = data.photo;
        student.status = data.status;
        student.start_date = Day(data.start_date) ?? student.start_date ?? Day(now);
        student.left_date = data.status == 3 ? Day(data.left_date) : null;
        student.notes = data.notes;
        student.pay_ref = NullIfEmpty(data.pay_ref);
        student.allergies = NullIfEmpty(data.allergies);
        student.medical_notes = NullIfEmpty(data.medical_notes);
        student.blood_type = NullIfEmpty(data.blood_type);
        if (data.discountid is long discountId
            && !await _db.discount.AnyAsync(d => d.discountid == discountId && !d.is_deleted))
            throw new InvalidOperationException("discount_not_found");
        student.discountid = data.discountid;
        student.updated = now;

        await _db.SaveChangesAsync();

        var open = await _db.enrollment.Where(e => e.studentid == student.studentid && e.isactive).ToListAsync();

        if (student.status == 3)
        {
            foreach (var e in open)
            {
                e.isactive = false;
                e.left_at = student.left_date;
            }
        }
        else if (group != null)
        {
            var current = open.FirstOrDefault(e => e.groupid == group.groupid);
            if (current == null)
            {
                // Picking another class on the child's form moves them: the old place closes today.
                // (Being in two classes at once is still possible through "add to class".)
                if (data.studentid > 0)
                {
                    foreach (var other in open)
                    {
                        other.isactive = false;
                        other.left_at = Day(now);
                    }
                }

                if (group.capacity > 0
                    && await _db.enrollment.CountAsync(e => e.groupid == group.groupid && e.isactive) >= group.capacity)
                    throw new InvalidOperationException("group_full");

                _db.enrollment.Add(new Enrollment
                {
                    groupid = group.groupid,
                    studentid = student.studentid,
                    fee_amount = data.fee_amount ?? group.fee_amount,
                    // A new child joins the class on their start date; a child moving classes joins
                    // the new one today. start_date stays the child's own first day.
                    joined = data.studentid > 0 ? now : student.start_date ?? now,
                    isactive = true,
                });
            }
            else
            {
                if (data.fee_amount is decimal fee) current.fee_amount = fee;
            }
        }

        await _db.SaveChangesAsync();
        return new { student.studentid };
    }

    // ---- notes --------------------------------------------------------------

    public async Task<List<NoteRT>> Notes(long studentId)
    {
        var staff = await _db.staff.AsNoTracking().ToDictionaryAsync(s => s.staffid, s => s.staffname);
        var rows = await _db.student_note.AsNoTracking()
            .Where(n => n.studentid == studentId && !n.is_deleted)
            .OrderByDescending(n => n.created)
            .ToListAsync();
        return rows.Select(n => new NoteRT
        {
            noteid = n.noteid,
            body = n.body,
            author = staff.TryGetValue(n.staffid, out var name) ? name : null,
            created = n.created,
        }).ToList();
    }

    public async Task<object> AddNote(long studentId, NoteBT data, int staffId)
    {
        var body = Norm(data.body);
        if (body.Length == 0) throw new ArgumentException("note_required");
        _ = await _db.student.AsNoTracking().FirstOrDefaultAsync(s => s.studentid == studentId && !s.is_deleted)
            ?? throw new InvalidOperationException("student_not_found");

        var note = new StudentNote { studentid = studentId, body = body, staffid = staffId, created = DateTime.UtcNow };
        _db.student_note.Add(note);
        await _db.SaveChangesAsync();
        return new { note.noteid };
    }

    public async Task<object> DeleteNote(long studentId, long noteId)
    {
        var note = await _db.student_note.FirstOrDefaultAsync(n => n.noteid == noteId && n.studentid == studentId && !n.is_deleted)
            ?? throw new InvalidOperationException("note_not_found");
        note.is_deleted = true;
        await _db.SaveChangesAsync();
        return new { ok = true };
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
