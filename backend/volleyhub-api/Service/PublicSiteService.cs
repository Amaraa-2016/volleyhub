using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace volleyhub_api.Service;

// The course directory on the public site. Anonymous callers send no tenantid header, so this
// service cannot use the request-scoped VolleyDbContext - it opens a context per centre with a
// FixedTenantProvider instead, the same way schema provisioning does.
//
// What the site lists is COURSES, gathered from every active centre. A course carries its own
// address, phone and price, because that is what someone is choosing between; the centre's name
// rides along as a subtitle. Everything here is read-only, and a course appears only while its
// `isactive` flag is on - that flag is the centre's own publish switch.
public class PublicSiteService
{
    private readonly AccountDbContext _db;
    private readonly string _connectionString;
    private readonly ILogger<PublicSiteService> _logger;

    public PublicSiteService(AccountDbContext db, IConfiguration config, ILogger<PublicSiteService> logger)
    {
        _db = db;
        _connectionString = config["ConnectionStrings:dbCon"]!;
        _logger = logger;
    }

    private VolleyDbContext OpenTenant(int tenantId)
    {
        var options = new DbContextOptionsBuilder<VolleyDbContext>()
            .UseNpgsql(_connectionString)
            .ReplaceService<IModelCacheKeyFactory, SchemaAwareModelCacheKeyFactory>()
            .Options;
        return new VolleyDbContext(options, new FixedTenantProvider("tenant_" + tenantId));
    }

    // ---- directory --------------------------------------------------------

    // `tenantId` narrows the list to one centre, which is what the logo strip does when clicked.
    public async Task<List<CourseCardRT>> Courses(string? search, int? tenantId = null)
    {
        var tenants = await _db.tenant.AsNoTracking()
            .Where(t => t.isactive && (tenantId == null || t.tenantid == tenantId))
            .OrderBy(t => t.tenantname)
            .ToListAsync();

        var term = (search ?? "").Trim().ToLowerInvariant();
        var cards = new List<CourseCardRT>();

        foreach (var tenant in tenants)
        {
            // One query per centre: a single cross-schema aggregate is not expressible without
            // dynamic SQL over every schema, and the number of centres is small.
            try
            {
                await using var db = OpenTenant(tenant.tenantid);

                var groups = await db.training_group.AsNoTracking()
                    .Where(g => !g.is_deleted && g.isactive)
                    .OrderBy(g => g.name)
                    .ToListAsync();
                if (groups.Count == 0) continue;

                var ids = groups.Select(g => g.groupid).ToList();

                var enrolled = await db.enrollment.AsNoTracking()
                    .Where(e => ids.Contains(e.groupid) && e.isactive)
                    .GroupBy(e => e.groupid)
                    .Select(g => new { groupid = g.Key, n = g.Count() })
                    .ToDictionaryAsync(x => x.groupid, x => x.n);

                var schedule = (await db.schedule_entry.AsNoTracking()
                        .Where(s => ids.Contains(s.groupid) && s.isactive)
                        .OrderBy(s => s.weekday).ThenBy(s => s.start_minute)
                        .ToListAsync())
                    .GroupBy(s => s.groupid)
                    .ToDictionary(g => g.Key, g => g.Select(s => new PublicScheduleRT
                    {
                        weekday = s.weekday,
                        start_minute = s.start_minute,
                        end_minute = s.end_minute,
                    }).ToList());

                foreach (var g in groups)
                {
                    if (term.Length > 0
                        && !g.name.ToLowerInvariant().Contains(term)
                        && !(g.address ?? "").ToLowerInvariant().Contains(term)
                        && !(g.agegroup ?? "").ToLowerInvariant().Contains(term)
                        && !tenant.tenantname.ToLowerInvariant().Contains(term))
                    {
                        continue;
                    }

                    cards.Add(new CourseCardRT
                    {
                        tenantid = tenant.tenantid,
                        groupid = g.groupid,
                        tenantname = tenant.tenantname,
                        name = g.name,
                        cover = g.cover,
                        level = g.level,
                        agegroup = g.agegroup,
                        gender = g.gender,
                        fee_amount = g.fee_amount,
                        capacity = g.capacity,
                        enrolled = enrolled.TryGetValue(g.groupid, out var n) ? n : 0,
                        start_date = g.start_date,
                        address = g.address,
                        phone = g.phone,
                        map_url = g.map_url,
                        schedule = schedule.TryGetValue(g.groupid, out var sch) ? sch : [],
                    });
                }
            }
            catch (Exception ex)
            {
                // A centre whose schema is missing or mid-provision must not take the whole
                // directory down - it simply contributes nothing.
                _logger.LogWarning(ex, "Skipped tenant {Tenant} while listing courses", tenant.tenantid);
            }
        }

        return cards;
    }

    // The logo strip. A centre with no active course is left out on purpose: clicking its logo
    // would land on an empty list, which reads as a broken site rather than an empty centre.
    public async Task<List<CenterCardRT>> Centers()
    {
        var tenants = await _db.tenant.AsNoTracking()
            .Where(t => t.isactive)
            .OrderBy(t => t.tenantname)
            .ToListAsync();

        var cards = new List<CenterCardRT>();
        foreach (var tenant in tenants)
        {
            try
            {
                await using var db = OpenTenant(tenant.tenantid);
                var count = await db.training_group.AsNoTracking()
                    .CountAsync(g => !g.is_deleted && g.isactive);
                if (count == 0) continue;

                cards.Add(new CenterCardRT
                {
                    tenantid = tenant.tenantid,
                    tenantname = tenant.tenantname,
                    logo = tenant.logo,
                    coursecount = count,
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Skipped tenant {Tenant} while listing centers", tenant.tenantid);
            }
        }

        return cards;
    }

    public async Task<CourseDetailRT> Course(int tenantId, long groupId)
    {
        var tenant = await _db.tenant.AsNoTracking()
            .FirstOrDefaultAsync(t => t.tenantid == tenantId && t.isactive)
            ?? throw new InvalidOperationException("training_not_found");

        await using var db = OpenTenant(tenantId);

        var g = await db.training_group.AsNoTracking()
            .FirstOrDefaultAsync(x => x.groupid == groupId && !x.is_deleted && x.isactive)
            ?? throw new InvalidOperationException("training_not_found");

        var enrolled = await db.enrollment.AsNoTracking()
            .CountAsync(e => e.groupid == groupId && e.isactive);

        var schedule = (await db.schedule_entry.AsNoTracking()
                .Where(s => s.groupid == groupId && s.isactive)
                .OrderBy(s => s.weekday).ThenBy(s => s.start_minute)
                .ToListAsync())
            .Select(s => new PublicScheduleRT
            {
                weekday = s.weekday,
                start_minute = s.start_minute,
                end_minute = s.end_minute,
            }).ToList();

        var venue = g.venueid is long vid
            ? await db.venue.AsNoTracking().Where(v => v.venueid == vid).Select(v => v.name).FirstOrDefaultAsync()
            : null;

        var coaches = await (from gc in db.group_coach.AsNoTracking()
                             join c in db.coach.AsNoTracking() on gc.coachid equals c.coachid
                             where gc.groupid == groupId && !c.is_deleted && c.isactive
                             orderby c.sort_order, c.last_name
                             select new PublicCoachRT
                             {
                                 coachid = c.coachid,
                                 last_name = c.last_name,
                                 first_name = c.first_name,
                                 photo = c.photo,
                                 position = c.position,
                                 rank = c.rank,
                                 bio = c.bio,
                             }).ToListAsync();

        return new CourseDetailRT
        {
            tenantid = tenant.tenantid,
            groupid = g.groupid,
            tenantname = tenant.tenantname,
            tenantphone = tenant.contactphone,
            tenantlogo = tenant.logo,
            name = g.name,
            cover = g.cover,
            level = g.level,
            agegroup = g.agegroup,
            gender = g.gender,
            fee_amount = g.fee_amount,
            capacity = g.capacity,
            enrolled = enrolled,
            start_date = g.start_date,
            address = g.address,
            phone = g.phone,
            map_url = g.map_url,
            notes = g.notes,
            venuename = venue,
            coaches = coaches,
            schedule = schedule,
        };
    }

    // ---- the centre's own profile ----------------------------------------

    public async Task<TrainingProfileBT> Profile(int tenantId)
    {
        var t = await _db.tenant.AsNoTracking().FirstOrDefaultAsync(x => x.tenantid == tenantId)
            ?? throw new InvalidOperationException("training_not_found");

        return new TrainingProfileBT
        {
            tagline = t.tagline,
            description = t.description,
            logo = t.logo,
            cover = t.cover,
            photos = t.photos,
            address = t.address,
            city = t.city,
            district = t.district,
            contactphone = t.contactphone,
            email = t.email,
            website = t.website,
            facebook = t.facebook,
            instagram = t.instagram,
            price_from = t.price_from,
            age_from = t.age_from,
            age_to = t.age_to,
            latitude = t.latitude,
            longitude = t.longitude,
            is_published = t.is_published,
        };
    }

    public async Task<object> SaveProfile(int tenantId, TrainingProfileBT data)
    {
        var t = await _db.tenant.FirstOrDefaultAsync(x => x.tenantid == tenantId)
            ?? throw new InvalidOperationException("training_not_found");

        if (data.age_from is int af && data.age_to is int at && at < af)
            throw new ArgumentException("age_to_before_age_from");

        static string? Clean(string? s) => (s ?? "").Trim() is { Length: > 0 } v ? v : null;

        t.tagline = Clean(data.tagline);
        t.description = data.description;
        t.logo = Clean(data.logo);
        t.cover = Clean(data.cover);
        t.photos = Clean(data.photos);
        t.address = Clean(data.address);
        t.city = Clean(data.city);
        t.district = Clean(data.district);
        t.contactphone = Clean(data.contactphone);
        t.email = Clean(data.email);
        t.website = Clean(data.website);
        t.facebook = Clean(data.facebook);
        t.instagram = Clean(data.instagram);
        t.price_from = data.price_from;
        t.age_from = data.age_from;
        t.age_to = data.age_to;
        t.latitude = data.latitude;
        t.longitude = data.longitude;
        t.is_published = data.is_published;

        await _db.SaveChangesAsync();
        return new { ok = true, t.is_published };
    }
}
