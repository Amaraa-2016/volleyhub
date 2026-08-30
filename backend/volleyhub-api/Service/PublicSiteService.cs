using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace volleyhub_api.Service;

// The training directory on the public site. Anonymous callers send no tenantid header, so this
// service cannot use the request-scoped VolleyDbContext - it opens a context per centre with a
// FixedTenantProvider instead, the same way schema provisioning does.
//
// Everything here is read-only and shows only what a centre has chosen to publish.
public class PublicSiteService
{
    private readonly AccountDbContext _db;
    private readonly string _connectionString;

    public PublicSiteService(AccountDbContext db, IConfiguration config)
    {
        _db = db;
        _connectionString = config["ConnectionStrings:dbCon"]!;
    }

    private VolleyDbContext OpenTenant(int tenantId)
    {
        var options = new DbContextOptionsBuilder<VolleyDbContext>()
            .UseNpgsql(_connectionString)
            .ReplaceService<IModelCacheKeyFactory, SchemaAwareModelCacheKeyFactory>()
            .Options;
        return new VolleyDbContext(options, new FixedTenantProvider("tenant_" + tenantId));
    }

    private static List<string> SplitImages(string? images) =>
        (images ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

    // ---- directory --------------------------------------------------------

    public async Task<List<TrainingCardRT>> Trainings(string? search, string? city, int? age)
    {
        // is_published is the centre's own switch: approval creates the tenant, the owner decides
        // when the profile is ready to be seen.
        var query = _db.tenant.AsNoTracking().Where(t => t.isactive && t.is_published);

        var term = (search ?? "").Trim().ToLowerInvariant();
        if (term.Length > 0)
            query = query.Where(t => t.tenantname.ToLower().Contains(term)
                || (t.tagline != null && t.tagline.ToLower().Contains(term)));

        if (!string.IsNullOrWhiteSpace(city)) query = query.Where(t => t.city == city);
        if (age is int a)
            query = query.Where(t => (t.age_from == null || t.age_from <= a) && (t.age_to == null || t.age_to >= a));

        var tenants = await query.OrderBy(t => t.tenantname).Take(200).ToListAsync();

        var cards = new List<TrainingCardRT>(tenants.Count);
        foreach (var t in tenants)
        {
            // One count per centre. Directory pages are small and cached by the browser; a single
            // cross-schema aggregate is not possible without dynamic SQL over every schema.
            var groupCount = 0;
            try
            {
                await using var tenantDb = OpenTenant(t.tenantid);
                groupCount = await tenantDb.training_group.AsNoTracking()
                    .CountAsync(g => !g.is_deleted && g.isactive);
            }
            catch (Exception)
            {
                // A published centre whose schema is missing or mid-provision must not take the
                // whole directory down; it simply shows no groups.
            }

            cards.Add(ToCard(t, groupCount));
        }

        return cards;
    }

    public async Task<TrainingDetailRT> Training(int tenantId)
    {
        var t = await _db.tenant.AsNoTracking()
            .FirstOrDefaultAsync(x => x.tenantid == tenantId && x.isactive && x.is_published)
            ?? throw new InvalidOperationException("training_not_found");

        var detail = new TrainingDetailRT
        {
            tenantid = t.tenantid,
            tenantname = t.tenantname,
            tagline = t.tagline,
            logo = t.logo,
            cover = t.cover,
            city = t.city,
            district = t.district,
            address = t.address,
            price_from = t.price_from,
            age_from = t.age_from,
            age_to = t.age_to,
            description = t.description,
            photos = SplitImages(t.photos),
            contactphone = t.contactphone,
            email = t.email,
            website = t.website,
            facebook = t.facebook,
            instagram = t.instagram,
            latitude = t.latitude,
            longitude = t.longitude,
        };

        try
        {
            await using var tenantDb = OpenTenant(tenantId);

            var groups = await tenantDb.training_group.AsNoTracking()
                .Where(g => !g.is_deleted && g.isactive)
                .OrderBy(g => g.name)
                .ToListAsync();

            var groupIds = groups.Select(g => g.groupid).ToList();
            var venues = await tenantDb.venue.AsNoTracking().ToDictionaryAsync(v => v.venueid, v => v.name);

            var enrolled = await tenantDb.enrollment.AsNoTracking()
                .Where(e => groupIds.Contains(e.groupid) && e.isactive)
                .GroupBy(e => e.groupid)
                .Select(g => new { groupid = g.Key, n = g.Count() })
                .ToDictionaryAsync(x => x.groupid, x => x.n);

            var schedule = (await tenantDb.schedule_entry.AsNoTracking()
                    .Where(s => groupIds.Contains(s.groupid) && s.isactive)
                    .OrderBy(s => s.weekday).ThenBy(s => s.start_minute)
                    .ToListAsync())
                .GroupBy(s => s.groupid)
                .ToDictionary(g => g.Key, g => g.Select(s => new PublicScheduleRT
                {
                    weekday = s.weekday,
                    start_minute = s.start_minute,
                    end_minute = s.end_minute,
                }).ToList());

            detail.groups = groups.Select(g => new PublicGroupRT
            {
                groupid = g.groupid,
                name = g.name,
                level = g.level,
                agegroup = g.agegroup,
                gender = g.gender,
                fee_amount = g.fee_amount,
                capacity = g.capacity,
                enrolled = enrolled.TryGetValue(g.groupid, out var n) ? n : 0,
                venuename = g.venueid is long v && venues.TryGetValue(v, out var vn) ? vn : null,
                schedule = schedule.TryGetValue(g.groupid, out var sch) ? sch : [],
            }).ToList();

            detail.groupcount = detail.groups.Count;
        }
        catch (Exception)
        {
            // As in the listing: a profile stays readable even when its schema is not.
        }

        return detail;
    }

    public async Task<List<string>> Cities()
    {
        return await _db.tenant.AsNoTracking()
            .Where(t => t.isactive && t.is_published && t.city != null)
            .Select(t => t.city!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
    }

    private static TrainingCardRT ToCard(Model.Tenant t, int groupCount) => new()
    {
        tenantid = t.tenantid,
        tenantname = t.tenantname,
        tagline = t.tagline,
        logo = t.logo,
        cover = t.cover,
        city = t.city,
        district = t.district,
        address = t.address,
        price_from = t.price_from,
        age_from = t.age_from,
        age_to = t.age_to,
        groupcount = groupCount,
    };

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
