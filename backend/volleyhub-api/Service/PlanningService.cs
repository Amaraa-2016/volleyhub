using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Model;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Service;

// The drill library and reusable lesson plans, and which plan a class session uses.
public partial class PlanningService
{
    private readonly VolleyDbContext _db;

    public PlanningService(VolleyDbContext db)
    {
        _db = db;
    }

    private static string Norm(string? s) => (s ?? string.Empty).Trim();
    private static string? NullIfEmpty(string? s) => Norm(s) is { Length: > 0 } v ? v : null;

    private static List<short> ParseSkills(string? csv) =>
        (csv ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(x => short.TryParse(x, out var v) ? v : (short)0)
            .Where(v => v > 0)
            .Distinct()
            .ToList();

    // ---- drills ---------------------------------------------------------------

    public async Task<List<DrillRT>> Drills()
    {
        var drills = await _db.drill.AsNoTracking().Where(d => !d.is_deleted).OrderBy(d => d.name).ToListAsync();
        var liveplans = _db.plan.AsNoTracking().Where(p => !p.is_deleted).Select(p => p.planid);
        var uses = await _db.plan_item.AsNoTracking()
            .Where(i => i.drillid != null && liveplans.Contains(i.planid))
            .GroupBy(i => i.drillid!.Value)
            .Select(g => new { drillid = g.Key, n = g.Select(i => i.planid).Distinct().Count() })
            .ToDictionaryAsync(x => x.drillid, x => x.n);

        return drills.Select(d => new DrillRT
        {
            drillid = d.drillid,
            name = d.name,
            description = d.description,
            minutes = d.minutes,
            level = d.level,
            equipment = d.equipment,
            skillids = ParseSkills(d.skills),
            plan_count = uses.TryGetValue(d.drillid, out var n) ? n : 0,
        }).ToList();
    }

    public async Task<object> SaveDrill(DrillBT data)
    {
        var name = Norm(data.name);
        if (name.Length == 0) throw new ArgumentException("name_required");
        if (data.minutes is < 0 or > 600) throw new ArgumentException("minutes_out_of_range");

        var now = DateTime.UtcNow;
        Drill drill;
        if (data.drillid > 0)
        {
            drill = await _db.drill.FirstOrDefaultAsync(d => d.drillid == data.drillid && !d.is_deleted)
                ?? throw new InvalidOperationException("drill_not_found");
        }
        else
        {
            drill = new Drill { created = now };
            _db.drill.Add(drill);
        }

        drill.name = name;
        drill.description = NullIfEmpty(data.description);
        drill.minutes = data.minutes;
        drill.level = NullIfEmpty(data.level);
        drill.equipment = NullIfEmpty(data.equipment);
        drill.skills = string.Join(",", (data.skillids ?? []).Distinct());
        drill.updated = now;

        await _db.SaveChangesAsync();
        return new { drill.drillid };
    }

    // Plans that used it keep their step - the step's own title and minutes were copied in.
    public async Task<object> DeleteDrill(long drillId)
    {
        var drill = await _db.drill.FirstOrDefaultAsync(d => d.drillid == drillId && !d.is_deleted)
            ?? throw new InvalidOperationException("drill_not_found");
        drill.is_deleted = true;
        drill.updated = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---- plans ----------------------------------------------------------------

    public async Task<List<PlanRT>> Plans()
    {
        var plans = await _db.plan.AsNoTracking().Where(p => !p.is_deleted).OrderBy(p => p.name).ToListAsync();
        if (plans.Count == 0) return [];
        var ids = plans.Select(p => p.planid).ToList();
        var items = await Items(ids);
        return plans.Select(p => ToRT(p, items.TryGetValue(p.planid, out var list) ? list : new List<PlanItemRT>())).ToList();
    }

    public async Task<PlanRT> Plan(long planId)
    {
        var plan = await _db.plan.AsNoTracking().FirstOrDefaultAsync(p => p.planid == planId && !p.is_deleted)
            ?? throw new InvalidOperationException("plan_not_found");
        var items = await Items([planId]);
        return ToRT(plan, items.TryGetValue(planId, out var list) ? list : new List<PlanItemRT>());
    }

    private async Task<Dictionary<long, List<PlanItemRT>>> Items(List<long> planIds)
    {
        var rows = await _db.plan_item.AsNoTracking()
            .Where(i => planIds.Contains(i.planid))
            .OrderBy(i => i.sort_order)
            .ToListAsync();
        var drillIds = rows.Where(i => i.drillid != null).Select(i => i.drillid!.Value).Distinct().ToList();
        var drills = await _db.drill.AsNoTracking()
            .Where(d => drillIds.Contains(d.drillid))
            .ToDictionaryAsync(d => d.drillid);

        return rows.GroupBy(i => i.planid).ToDictionary(g => g.Key, g => g.Select(i =>
        {
            Drill? d = i.drillid is long id && drills.TryGetValue(id, out var found) && !found.is_deleted ? found : null;
            return new PlanItemRT
            {
                itemid = i.itemid,
                drillid = d?.drillid,
                title = i.title,
                minutes = i.minutes,
                description = d?.description,
                skillids = ParseSkills(d?.skills),
            };
        }).ToList());
    }

    private static PlanRT ToRT(Plan p, List<PlanItemRT> items) => new()
    {
        planid = p.planid,
        name = p.name,
        notes = p.notes,
        items = items,
        total_minutes = items.Sum(i => i.minutes),
    };

    // Items are replaced wholesale: the editor always sends the full ordered list.
    public async Task<object> SavePlan(PlanBT data)
    {
        var name = Norm(data.name);
        if (name.Length == 0) throw new ArgumentException("name_required");
        var steps = (data.items ?? []).Where(i => Norm(i.title).Length > 0).ToList();
        if (steps.Any(i => i.minutes is < 0 or > 600)) throw new ArgumentException("minutes_out_of_range");

        var now = DateTime.UtcNow;
        Plan plan;
        if (data.planid > 0)
        {
            plan = await _db.plan.FirstOrDefaultAsync(p => p.planid == data.planid && !p.is_deleted)
                ?? throw new InvalidOperationException("plan_not_found");
        }
        else
        {
            plan = new Plan { created = now };
            _db.plan.Add(plan);
        }

        plan.name = name;
        plan.notes = NullIfEmpty(data.notes);
        plan.updated = now;
        await _db.SaveChangesAsync();

        _db.plan_item.RemoveRange(await _db.plan_item.Where(i => i.planid == plan.planid).ToListAsync());
        var order = 0;
        foreach (var step in steps)
        {
            _db.plan_item.Add(new PlanItem
            {
                planid = plan.planid,
                drillid = step.drillid,
                title = Norm(step.title),
                minutes = step.minutes,
                sort_order = ++order,
            });
        }
        await _db.SaveChangesAsync();
        return new { plan.planid };
    }

    public async Task<object> DeletePlan(long planId)
    {
        var plan = await _db.plan.FirstOrDefaultAsync(p => p.planid == planId && !p.is_deleted)
            ?? throw new InvalidOperationException("plan_not_found");
        plan.is_deleted = true;
        plan.updated = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    public async Task<object> SetSessionPlan(long sessionId, long? planId)
    {
        var session = await _db.training_session.FirstOrDefaultAsync(s => s.sessionid == sessionId && !s.is_deleted)
            ?? throw new InvalidOperationException("session_not_found");
        if (planId is long pid && !await _db.plan.AnyAsync(p => p.planid == pid && !p.is_deleted))
            throw new InvalidOperationException("plan_not_found");
        session.planid = planId;
        session.updated = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new { ok = true };
    }
}
