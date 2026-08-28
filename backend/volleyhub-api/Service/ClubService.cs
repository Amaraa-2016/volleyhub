using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Model;
using volleyhub_api.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Service;

// Everything inside one club schema that is not a competition: squads, players, rosters, venues
// and news. The schema is already resolved by the time VolleyDbContext is injected, so nothing
// here ever filters by tenant.
public class ClubService
{
    private readonly VolleyDbContext _db;
    // The public schema, needed only to link a player card to the login of the same person.
    private readonly AccountDbContext _accounts;
    private readonly ITenantProvider _tenant;

    public ClubService(VolleyDbContext db, AccountDbContext accounts, ITenantProvider tenant)
    {
        _db = db;
        _accounts = accounts;
        _tenant = tenant;
    }

    private static string Norm(string? s) => (s ?? string.Empty).Trim();

    // ---- teams ------------------------------------------------------------

    public async Task<List<TeamRT>> Teams(bool includeInactive = false)
    {
        var query = _db.team.AsNoTracking().Where(t => !t.is_deleted);
        if (!includeInactive) query = query.Where(t => t.isactive);

        var teams = await query.OrderBy(t => t.name).ToListAsync();
        var ids = teams.Select(t => t.teamid).ToList();

        var counts = await _db.team_player.AsNoTracking()
            .Where(tp => ids.Contains(tp.teamid) && tp.isactive)
            .GroupBy(tp => tp.teamid)
            .Select(g => new { teamid = g.Key, count = g.Count() })
            .ToDictionaryAsync(x => x.teamid, x => x.count);

        var coaches = await _db.staff.AsNoTracking()
            .ToDictionaryAsync(s => s.staffid, s => s.staffname);

        return teams.Select(t => new TeamRT
        {
            teamid = t.teamid,
            name = t.name,
            shortname = t.shortname,
            gender = t.gender,
            agegroup = t.agegroup,
            division = t.division,
            coach_staffid = t.coach_staffid,
            coachname = t.coach_staffid is int c && coaches.TryGetValue(c, out var cn) ? cn : null,
            logo = t.logo,
            notes = t.notes,
            isactive = t.isactive,
            playercount = counts.TryGetValue(t.teamid, out var n) ? n : 0,
        }).ToList();
    }

    public async Task<TeamRT> Team(long teamId)
    {
        var teams = await Teams(includeInactive: true);
        return teams.FirstOrDefault(t => t.teamid == teamId)
            ?? throw new InvalidOperationException("team_not_found");
    }

    public async Task<object> SaveTeam(TeamBT data)
    {
        if (Norm(data.name).Length == 0) throw new ArgumentException("name_required");

        var now = DateTime.UtcNow;
        Team team;
        if (data.teamid > 0)
        {
            team = await _db.team.FirstOrDefaultAsync(t => t.teamid == data.teamid && !t.is_deleted)
                ?? throw new InvalidOperationException("team_not_found");
        }
        else
        {
            team = new Team { created = now };
            _db.team.Add(team);
        }

        team.name = Norm(data.name);
        team.shortname = Norm(data.shortname) is { Length: > 0 } sn ? sn : null;
        team.gender = data.gender;
        team.agegroup = Norm(data.agegroup) is { Length: > 0 } ag ? ag : null;
        team.division = Norm(data.division) is { Length: > 0 } dv ? dv : null;
        team.coach_staffid = data.coach_staffid;
        team.logo = data.logo;
        team.notes = data.notes;
        team.isactive = data.isactive;
        team.updated = now;

        await _db.SaveChangesAsync();
        return new { team.teamid };
    }

    // Soft delete: a team that has already played matches must stay resolvable in results.
    public async Task<object> DeleteTeam(long teamId)
    {
        var team = await _db.team.FirstOrDefaultAsync(t => t.teamid == teamId && !t.is_deleted)
            ?? throw new InvalidOperationException("team_not_found");

        var inUse = await _db.match.AnyAsync(m => !m.is_deleted && (m.hometeamid == teamId || m.awayteamid == teamId));
        if (inUse)
        {
            team.isactive = false;
            team.updated = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return new { ok = true, archived = true };
        }

        team.is_deleted = true;
        team.isactive = false;
        team.updated = DateTime.UtcNow;

        var roster = await _db.team_player.Where(tp => tp.teamid == teamId).ToListAsync();
        _db.team_player.RemoveRange(roster);

        await _db.SaveChangesAsync();
        return new { ok = true, archived = false };
    }

    // ---- roster -----------------------------------------------------------

    public async Task<List<RosterEntryRT>> Roster(long teamId)
    {
        return await (from tp in _db.team_player.AsNoTracking()
                      join p in _db.player.AsNoTracking() on tp.playerid equals p.playerid
                      where tp.teamid == teamId && tp.isactive && !p.is_deleted
                      orderby tp.jersey_no, p.last_name
                      select new RosterEntryRT
                      {
                          teamplayerid = tp.teamplayerid,
                          playerid = p.playerid,
                          last_name = p.last_name,
                          first_name = p.first_name,
                          position = p.position,
                          height_cm = p.height_cm,
                          jersey_no = tp.jersey_no,
                          is_captain = tp.is_captain,
                          joined = tp.joined,
                          status = p.status,
                      }).ToListAsync();
    }

    public async Task<object> AddToRoster(long teamId, RosterEntryBT data)
    {
        _ = await _db.team.AsNoTracking().FirstOrDefaultAsync(t => t.teamid == teamId && !t.is_deleted)
            ?? throw new InvalidOperationException("team_not_found");
        _ = await _db.player.AsNoTracking().FirstOrDefaultAsync(p => p.playerid == data.playerid && !p.is_deleted)
            ?? throw new InvalidOperationException("player_not_found");

        var existing = await _db.team_player
            .FirstOrDefaultAsync(tp => tp.teamid == teamId && tp.playerid == data.playerid && tp.isactive);

        if (data.jersey_no is int jersey)
        {
            var taken = await _db.team_player.AnyAsync(tp =>
                tp.teamid == teamId && tp.isactive && tp.jersey_no == jersey && tp.playerid != data.playerid);
            if (taken) throw new InvalidOperationException("jersey_taken");
        }

        if (existing != null)
        {
            existing.jersey_no = data.jersey_no;
            existing.is_captain = data.is_captain;
        }
        else
        {
            existing = new TeamPlayer
            {
                teamid = teamId,
                playerid = data.playerid,
                jersey_no = data.jersey_no,
                is_captain = data.is_captain,
                joined = DateTime.UtcNow,
                isactive = true,
            };
            _db.team_player.Add(existing);
        }

        // At most one captain per squad.
        if (data.is_captain)
        {
            var others = await _db.team_player
                .Where(tp => tp.teamid == teamId && tp.isactive && tp.playerid != data.playerid && tp.is_captain)
                .ToListAsync();
            foreach (var other in others) other.is_captain = false;
        }

        await _db.SaveChangesAsync();
        return new { existing.teamplayerid };
    }

    // Leaving a squad keeps the row (left_at) so past line-ups stay reconstructable.
    public async Task<object> RemoveFromRoster(long teamId, long playerId)
    {
        var entry = await _db.team_player
            .FirstOrDefaultAsync(tp => tp.teamid == teamId && tp.playerid == playerId && tp.isactive)
            ?? throw new InvalidOperationException("roster_entry_not_found");

        entry.isactive = false;
        entry.left_at = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---- players ----------------------------------------------------------

    public async Task<List<PlayerRT>> Players(long? teamId, string? search, bool unassignedOnly = false)
    {
        var term = Norm(search).ToLowerInvariant();

        var query = from p in _db.player.AsNoTracking()
                    where !p.is_deleted
                    join tp in _db.team_player.AsNoTracking().Where(x => x.isactive)
                        on p.playerid equals tp.playerid into gtp
                    from tp in gtp.DefaultIfEmpty()
                    join t in _db.team.AsNoTracking() on tp.teamid equals t.teamid into gt
                    from t in gt.DefaultIfEmpty()
                    select new PlayerRT
                    {
                        playerid = p.playerid,
                        accountid = p.accountid,
                        last_name = p.last_name,
                        first_name = p.first_name,
                        date_of_birth = p.date_of_birth,
                        gender = p.gender,
                        reg_no = p.reg_no,
                        phone = p.phone,
                        position = p.position,
                        height_cm = p.height_cm,
                        reach_cm = p.reach_cm,
                        photo = p.photo,
                        status = p.status,
                        notes = p.notes,
                        teamid = t != null ? t.teamid : null,
                        teamname = t != null ? t.name : null,
                        jersey_no = tp != null ? tp.jersey_no : null,
                        is_captain = tp != null && tp.is_captain,
                    };

        if (teamId is long tid) query = query.Where(p => p.teamid == tid);
        if (unassignedOnly) query = query.Where(p => p.teamid == null);
        if (term.Length > 0)
            query = query.Where(p => p.last_name.ToLower().Contains(term) || p.first_name.ToLower().Contains(term));

        return await query.OrderBy(p => p.last_name).ThenBy(p => p.first_name).ToListAsync();
    }

    public async Task<PlayerRT> Player(long playerId)
    {
        var players = await Players(null, null);
        return players.FirstOrDefault(p => p.playerid == playerId)
            ?? throw new InvalidOperationException("player_not_found");
    }

    public async Task<object> SavePlayer(PlayerBT data)
    {
        if (Norm(data.first_name).Length == 0) throw new ArgumentException("first_name_required");

        var now = DateTime.UtcNow;
        Player player;
        if (data.playerid > 0)
        {
            player = await _db.player.FirstOrDefaultAsync(p => p.playerid == data.playerid && !p.is_deleted)
                ?? throw new InvalidOperationException("player_not_found");
        }
        else
        {
            player = new Player { created = now };
            _db.player.Add(player);
        }

        player.last_name = Norm(data.last_name);
        player.first_name = Norm(data.first_name);
        player.date_of_birth = data.date_of_birth;
        player.gender = data.gender;
        player.reg_no = Norm(data.reg_no) is { Length: > 0 } rn ? rn : null;
        player.phone = Norm(data.phone) is { Length: > 0 } ph ? ph : null;
        player.position = data.position;
        player.height_cm = data.height_cm;
        player.reach_cm = data.reach_cm;
        player.photo = data.photo;
        player.status = data.status;
        player.notes = data.notes;
        player.updated = now;
        player.accountid = await FindAccountByPhone(player.phone);

        await _db.SaveChangesAsync();
        return new { player.playerid };
    }

    public async Task<object> DeletePlayer(long playerId)
    {
        var player = await _db.player.FirstOrDefaultAsync(p => p.playerid == playerId && !p.is_deleted)
            ?? throw new InvalidOperationException("player_not_found");

        player.is_deleted = true;
        player.updated = DateTime.UtcNow;

        var roster = await _db.team_player.Where(tp => tp.playerid == playerId && tp.isactive).ToListAsync();
        foreach (var entry in roster)
        {
            entry.isactive = false;
            entry.left_at = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // Ties a player card to the club member with the same phone number, which is what lets the
    // mobile app show someone their own profile. Only active members of this club are considered,
    // so a phone that happens to exist elsewhere on the platform links nothing. Re-evaluated on
    // every save, so a card created before the player signed up picks them up on the next edit.
    private async Task<int> FindAccountByPhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return 0;

        var tenantId = _tenant.GetTenantId();
        return await (from a in _accounts.account.AsNoTracking()
                      join m in _accounts.account_tenant.AsNoTracking() on a.accountid equals m.accountid
                      where a.phone == phone && m.tenantid == tenantId && m.status == "active"
                      select a.accountid).FirstOrDefaultAsync();
    }

    // The player record linked to a mobile login, if there is one. A fan or a parent has none,
    // which is why this returns null rather than throwing.
    public async Task<PlayerRT?> PlayerByAccount(int accountId)
    {
        if (accountId <= 0) return null;
        var players = await Players(null, null);
        return players.FirstOrDefault(p => p.accountid == accountId);
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
        venue.address = Norm(data.address) is { Length: > 0 } ad ? ad : null;
        venue.courts = data.courts < 1 ? 1 : data.courts;
        venue.contactphone = Norm(data.contactphone) is { Length: > 0 } cp ? cp : null;
        venue.notes = data.notes;
        venue.updated = now;

        await _db.SaveChangesAsync();
        return new { venue.venueid };
    }

    public async Task<object> DeleteVenue(long venueId)
    {
        var venue = await _db.venue.FirstOrDefaultAsync(v => v.venueid == venueId && !v.is_deleted)
            ?? throw new InvalidOperationException("venue_not_found");

        if (await _db.match.AnyAsync(m => m.venueid == venueId && !m.is_deleted))
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

        var rows = await query
            .OrderByDescending(a => a.published_at ?? a.created)
            .ToListAsync();

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

    public Task<List<Staff>> Staff() =>
        _db.staff.AsNoTracking().Where(s => s.isactive).OrderBy(s => s.staffname).ToListAsync();
}
