using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Model;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Service;

// Seasons, tournaments, fixtures, results and the league table. Standings are always computed from
// finished matches rather than stored, so correcting a score can never leave a stale table behind.
public class CompetitionService
{
    private readonly VolleyDbContext _db;

    public CompetitionService(VolleyDbContext db)
    {
        _db = db;
    }

    private static string Norm(string? s) => (s ?? string.Empty).Trim();

    // ---- seasons ----------------------------------------------------------

    public Task<List<Season>> Seasons() =>
        _db.season.AsNoTracking().Where(s => !s.is_deleted).OrderByDescending(s => s.startdate).ToListAsync();

    public async Task<object> SaveSeason(SeasonBT data)
    {
        if (Norm(data.name).Length == 0) throw new ArgumentException("name_required");
        if (data.enddate < data.startdate) throw new ArgumentException("enddate_before_startdate");

        var now = DateTime.UtcNow;
        Season season;
        if (data.seasonid > 0)
        {
            season = await _db.season.FirstOrDefaultAsync(s => s.seasonid == data.seasonid && !s.is_deleted)
                ?? throw new InvalidOperationException("season_not_found");
        }
        else
        {
            season = new Season { created = now };
            _db.season.Add(season);
        }

        season.name = Norm(data.name);
        season.startdate = data.startdate;
        season.enddate = data.enddate;
        season.isactive = data.isactive;
        season.updated = now;

        await _db.SaveChangesAsync();
        return new { season.seasonid };
    }

    public async Task<object> DeleteSeason(long seasonId)
    {
        var season = await _db.season.FirstOrDefaultAsync(s => s.seasonid == seasonId && !s.is_deleted)
            ?? throw new InvalidOperationException("season_not_found");

        if (await _db.tournament.AnyAsync(t => t.seasonid == seasonId && !t.is_deleted))
            throw new InvalidOperationException("season_in_use");

        season.is_deleted = true;
        season.updated = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---- tournaments ------------------------------------------------------

    public async Task<List<TournamentRT>> Tournaments(long? seasonId, short? status)
    {
        var query = _db.tournament.AsNoTracking().Where(t => !t.is_deleted);
        if (seasonId is long sid) query = query.Where(t => t.seasonid == sid);
        if (status is short st) query = query.Where(t => t.status == st);

        var tournaments = await query.OrderByDescending(t => t.startdate).ToListAsync();
        var ids = tournaments.Select(t => t.tournamentid).ToList();

        var seasons = await _db.season.AsNoTracking().ToDictionaryAsync(s => s.seasonid, s => s.name);
        var venues = await _db.venue.AsNoTracking().ToDictionaryAsync(v => v.venueid, v => v.name);

        var teamCounts = await _db.tournament_team.AsNoTracking()
            .Where(tt => ids.Contains(tt.tournamentid))
            .GroupBy(tt => tt.tournamentid)
            .Select(g => new { id = g.Key, n = g.Count() })
            .ToDictionaryAsync(x => x.id, x => x.n);

        var matchCounts = await _db.match.AsNoTracking()
            .Where(m => ids.Contains(m.tournamentid) && !m.is_deleted)
            .GroupBy(m => m.tournamentid)
            .Select(g => new { id = g.Key, n = g.Count() })
            .ToDictionaryAsync(x => x.id, x => x.n);

        return tournaments.Select(t => new TournamentRT
        {
            tournamentid = t.tournamentid,
            seasonid = t.seasonid,
            seasonname = t.seasonid is long s && seasons.TryGetValue(s, out var sn) ? sn : null,
            name = t.name,
            format = t.format,
            gender = t.gender,
            startdate = t.startdate,
            enddate = t.enddate,
            venueid = t.venueid,
            venuename = t.venueid is long v && venues.TryGetValue(v, out var vn) ? vn : null,
            status = t.status,
            best_of = t.best_of,
            notes = t.notes,
            teamcount = teamCounts.TryGetValue(t.tournamentid, out var tc) ? tc : 0,
            matchcount = matchCounts.TryGetValue(t.tournamentid, out var mc) ? mc : 0,
        }).ToList();
    }

    public async Task<TournamentRT> Tournament(long tournamentId)
    {
        var all = await Tournaments(null, null);
        return all.FirstOrDefault(t => t.tournamentid == tournamentId)
            ?? throw new InvalidOperationException("tournament_not_found");
    }

    public async Task<object> SaveTournament(TournamentBT data)
    {
        if (Norm(data.name).Length == 0) throw new ArgumentException("name_required");
        if (data.enddate < data.startdate) throw new ArgumentException("enddate_before_startdate");
        if (data.best_of is not (3 or 5)) throw new ArgumentException("best_of_must_be_3_or_5");

        var now = DateTime.UtcNow;
        Tournament tournament;
        if (data.tournamentid > 0)
        {
            tournament = await _db.tournament.FirstOrDefaultAsync(t => t.tournamentid == data.tournamentid && !t.is_deleted)
                ?? throw new InvalidOperationException("tournament_not_found");
        }
        else
        {
            tournament = new Tournament { created = now };
            _db.tournament.Add(tournament);
        }

        tournament.seasonid = data.seasonid;
        tournament.name = Norm(data.name);
        tournament.format = data.format;
        tournament.gender = data.gender;
        tournament.startdate = data.startdate;
        tournament.enddate = data.enddate;
        tournament.venueid = data.venueid;
        tournament.status = data.status;
        tournament.best_of = data.best_of;
        tournament.notes = data.notes;
        tournament.updated = now;

        await _db.SaveChangesAsync();
        return new { tournament.tournamentid };
    }

    public async Task<object> DeleteTournament(long tournamentId)
    {
        var tournament = await _db.tournament.FirstOrDefaultAsync(t => t.tournamentid == tournamentId && !t.is_deleted)
            ?? throw new InvalidOperationException("tournament_not_found");

        if (await _db.match.AnyAsync(m => m.tournamentid == tournamentId && !m.is_deleted && m.status == 3))
            throw new InvalidOperationException("tournament_has_results");

        tournament.is_deleted = true;
        tournament.updated = DateTime.UtcNow;

        var fixtures = await _db.match.Where(m => m.tournamentid == tournamentId && !m.is_deleted).ToListAsync();
        foreach (var fixture in fixtures)
        {
            fixture.is_deleted = true;
            fixture.updated = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---- entrants ---------------------------------------------------------

    public async Task<List<TournamentTeamRT>> TournamentTeams(long tournamentId)
    {
        return await (from tt in _db.tournament_team.AsNoTracking()
                      join t in _db.team.AsNoTracking() on tt.teamid equals t.teamid
                      where tt.tournamentid == tournamentId
                      orderby tt.pool, tt.seed, t.name
                      select new TournamentTeamRT
                      {
                          tournamentteamid = tt.tournamentteamid,
                          teamid = t.teamid,
                          teamname = t.name,
                          logo = t.logo,
                          seed = tt.seed,
                          pool = tt.pool,
                      }).ToListAsync();
    }

    public async Task<object> AddTournamentTeam(long tournamentId, TournamentTeamBT data)
    {
        _ = await _db.tournament.AsNoTracking().FirstOrDefaultAsync(t => t.tournamentid == tournamentId && !t.is_deleted)
            ?? throw new InvalidOperationException("tournament_not_found");
        _ = await _db.team.AsNoTracking().FirstOrDefaultAsync(t => t.teamid == data.teamid && !t.is_deleted)
            ?? throw new InvalidOperationException("team_not_found");

        var entry = await _db.tournament_team
            .FirstOrDefaultAsync(tt => tt.tournamentid == tournamentId && tt.teamid == data.teamid);

        if (entry == null)
        {
            entry = new TournamentTeam
            {
                tournamentid = tournamentId,
                teamid = data.teamid,
                registered = DateTime.UtcNow,
            };
            _db.tournament_team.Add(entry);
        }

        entry.seed = data.seed;
        entry.pool = Norm(data.pool) is { Length: > 0 } p ? p : null;

        await _db.SaveChangesAsync();
        return new { entry.tournamentteamid };
    }

    public async Task<object> RemoveTournamentTeam(long tournamentId, long teamId)
    {
        var entry = await _db.tournament_team
            .FirstOrDefaultAsync(tt => tt.tournamentid == tournamentId && tt.teamid == teamId)
            ?? throw new InvalidOperationException("entry_not_found");

        var hasMatches = await _db.match.AnyAsync(m => m.tournamentid == tournamentId && !m.is_deleted
            && (m.hometeamid == teamId || m.awayteamid == teamId));
        if (hasMatches) throw new InvalidOperationException("team_has_matches");

        _db.tournament_team.Remove(entry);
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // Single round robin over the entrants, one round per day from the start date. Only ever runs
    // on a tournament with no fixtures yet, so it cannot wipe a hand-built schedule.
    public async Task<object> GenerateFixtures(long tournamentId)
    {
        var tournament = await _db.tournament.AsNoTracking()
            .FirstOrDefaultAsync(t => t.tournamentid == tournamentId && !t.is_deleted)
            ?? throw new InvalidOperationException("tournament_not_found");

        if (await _db.match.AnyAsync(m => m.tournamentid == tournamentId && !m.is_deleted))
            throw new InvalidOperationException("fixtures_already_exist");

        var teams = await _db.tournament_team.AsNoTracking()
            .Where(tt => tt.tournamentid == tournamentId)
            .OrderBy(tt => tt.seed).ThenBy(tt => tt.tournamentteamid)
            .Select(tt => tt.teamid)
            .ToListAsync();

        if (teams.Count < 2) throw new InvalidOperationException("need_at_least_two_teams");

        // Circle method. An odd entry count gets a bye, represented by a 0 that is skipped.
        var rotation = new List<long>(teams);
        if (rotation.Count % 2 == 1) rotation.Add(0);

        var half = rotation.Count / 2;
        var rounds = rotation.Count - 1;
        var now = DateTime.UtcNow;
        var created = new List<Match>();

        for (var round = 0; round < rounds; round++)
        {
            var day = tournament.startdate.Date.AddDays(round);
            for (var i = 0; i < half; i++)
            {
                var home = rotation[i];
                var away = rotation[rotation.Count - 1 - i];
                if (home == 0 || away == 0) continue;

                // Alternate home advantage between rounds so no team hosts every fixture.
                var (h, a) = round % 2 == 0 ? (home, away) : (away, home);

                created.Add(new Match
                {
                    tournamentid = tournamentId,
                    hometeamid = h,
                    awayteamid = a,
                    venueid = tournament.venueid,
                    scheduled_at = day.AddHours(18).AddMinutes(i * 90),
                    round = $"Round {round + 1}",
                    status = 1,
                    created = now,
                    updated = now,
                });
            }

            // Rotate everything but the first entry.
            var last = rotation[^1];
            rotation.RemoveAt(rotation.Count - 1);
            rotation.Insert(1, last);
        }

        _db.match.AddRange(created);
        await _db.SaveChangesAsync();
        return new { created = created.Count };
    }

    // ---- matches ----------------------------------------------------------

    public async Task<List<MatchRT>> Matches(long? tournamentId, long? teamId, short? status,
        DateTime? from, DateTime? to, bool includeSets = false)
    {
        var query = _db.match.AsNoTracking().Where(m => !m.is_deleted);
        if (tournamentId is long tid) query = query.Where(m => m.tournamentid == tid);
        if (teamId is long team) query = query.Where(m => m.hometeamid == team || m.awayteamid == team);
        if (status is short st) query = query.Where(m => m.status == st);
        if (from is DateTime f) query = query.Where(m => m.scheduled_at >= f);
        if (to is DateTime t2) query = query.Where(m => m.scheduled_at <= t2);

        var matches = await query.OrderBy(m => m.scheduled_at).ToListAsync();
        return await Decorate(matches, includeSets);
    }

    public async Task<MatchRT> Match(long matchId)
    {
        var match = await _db.match.AsNoTracking().FirstOrDefaultAsync(m => m.matchid == matchId && !m.is_deleted)
            ?? throw new InvalidOperationException("match_not_found");
        return (await Decorate([match], includeSets: true))[0];
    }

    private async Task<List<MatchRT>> Decorate(List<Match> matches, bool includeSets)
    {
        if (matches.Count == 0) return [];

        var teams = await _db.team.AsNoTracking()
            .Select(t => new { t.teamid, t.name, t.logo })
            .ToDictionaryAsync(t => t.teamid, t => t);
        var venues = await _db.venue.AsNoTracking().ToDictionaryAsync(v => v.venueid, v => v.name);
        var tournaments = await _db.tournament.AsNoTracking().ToDictionaryAsync(t => t.tournamentid, t => t.name);

        var sets = new Dictionary<long, List<MatchSetRT>>();
        if (includeSets)
        {
            var ids = matches.Select(m => m.matchid).ToList();
            sets = (await _db.match_set.AsNoTracking()
                    .Where(s => ids.Contains(s.matchid))
                    .OrderBy(s => s.set_no)
                    .ToListAsync())
                .GroupBy(s => s.matchid)
                .ToDictionary(g => g.Key, g => g.Select(s => new MatchSetRT
                {
                    set_no = s.set_no,
                    home_points = s.home_points,
                    away_points = s.away_points,
                }).ToList());
        }

        return matches.Select(m => new MatchRT
        {
            matchid = m.matchid,
            tournamentid = m.tournamentid,
            tournamentname = tournaments.TryGetValue(m.tournamentid, out var tn) ? tn : null,
            hometeamid = m.hometeamid,
            hometeamname = teams.TryGetValue(m.hometeamid, out var ht) ? ht.name : "?",
            homelogo = teams.TryGetValue(m.hometeamid, out var ht2) ? ht2.logo : null,
            awayteamid = m.awayteamid,
            awayteamname = teams.TryGetValue(m.awayteamid, out var at) ? at.name : "?",
            awaylogo = teams.TryGetValue(m.awayteamid, out var at2) ? at2.logo : null,
            venueid = m.venueid,
            venuename = m.venueid is long v && venues.TryGetValue(v, out var vn) ? vn : null,
            scheduled_at = m.scheduled_at,
            round = m.round,
            status = m.status,
            home_sets = m.home_sets,
            away_sets = m.away_sets,
            notes = m.notes,
            sets = sets.TryGetValue(m.matchid, out var ss) ? ss : [],
        }).ToList();
    }

    public async Task<object> SaveMatch(MatchBT data)
    {
        if (data.hometeamid == data.awayteamid) throw new ArgumentException("teams_must_differ");

        _ = await _db.tournament.AsNoTracking()
            .FirstOrDefaultAsync(t => t.tournamentid == data.tournamentid && !t.is_deleted)
            ?? throw new InvalidOperationException("tournament_not_found");

        var now = DateTime.UtcNow;
        Match match;
        if (data.matchid > 0)
        {
            match = await _db.match.FirstOrDefaultAsync(m => m.matchid == data.matchid && !m.is_deleted)
                ?? throw new InvalidOperationException("match_not_found");
        }
        else
        {
            match = new Match { created = now };
            _db.match.Add(match);
        }

        match.tournamentid = data.tournamentid;
        match.hometeamid = data.hometeamid;
        match.awayteamid = data.awayteamid;
        match.venueid = data.venueid;
        match.scheduled_at = data.scheduled_at;
        match.round = Norm(data.round) is { Length: > 0 } r ? r : null;
        // A finished match only becomes finished through SaveResult, which owns the set counts.
        match.status = data.status == 3 ? match.status : data.status;
        match.notes = data.notes;
        match.updated = now;

        await _db.SaveChangesAsync();
        return new { match.matchid };
    }

    // Entering a result replaces every set of the match, so a correction is just a re-post. The
    // set counts on the match row are derived here and never written from the client.
    public async Task<object> SaveResult(long matchId, MatchResultBT data)
    {
        var match = await _db.match.FirstOrDefaultAsync(m => m.matchid == matchId && !m.is_deleted)
            ?? throw new InvalidOperationException("match_not_found");
        var tournament = await _db.tournament.AsNoTracking()
            .FirstAsync(t => t.tournamentid == match.tournamentid);

        var sets = (data.sets ?? []).OrderBy(s => s.set_no).ToList();
        if (sets.Count == 0) throw new ArgumentException("no_sets");

        var needed = tournament.best_of / 2 + 1;
        if (sets.Count > tournament.best_of) throw new ArgumentException("too_many_sets");

        short homeSets = 0, awaySets = 0;
        for (var i = 0; i < sets.Count; i++)
        {
            var set = sets[i];
            if (set.home_points < 0 || set.away_points < 0) throw new ArgumentException("negative_points");
            if (set.home_points == set.away_points) throw new ArgumentException("set_cannot_be_drawn");

            // A deciding fifth set is played to 15, the others to 25; either way the winner must be
            // two points clear.
            var target = i == tournament.best_of - 1 ? 15 : 25;
            var winner = Math.Max(set.home_points, set.away_points);
            var loser = Math.Min(set.home_points, set.away_points);
            if (winner < target) throw new ArgumentException($"set_{set.set_no}_winner_below_{target}");
            if (winner - loser < 2) throw new ArgumentException($"set_{set.set_no}_margin_below_2");
            if (winner > target && winner - loser > 2) throw new ArgumentException($"set_{set.set_no}_overrun");

            if (set.home_points > set.away_points) homeSets++; else awaySets++;
        }

        if (homeSets != needed && awaySets != needed)
            throw new ArgumentException("match_incomplete");
        if (homeSets == needed && awaySets == needed)
            throw new ArgumentException("both_teams_cannot_win");

        var existing = await _db.match_set.Where(s => s.matchid == matchId).ToListAsync();
        _db.match_set.RemoveRange(existing);
        _db.match_set.AddRange(sets.Select((s, i) => new MatchSet
        {
            matchid = matchId,
            set_no = (short)(i + 1),
            home_points = s.home_points,
            away_points = s.away_points,
        }));

        match.home_sets = homeSets;
        match.away_sets = awaySets;
        match.status = 3;
        if (!string.IsNullOrWhiteSpace(data.notes)) match.notes = data.notes;
        match.updated = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return new { match.matchid, match.home_sets, match.away_sets };
    }

    public async Task<object> DeleteMatch(long matchId)
    {
        var match = await _db.match.FirstOrDefaultAsync(m => m.matchid == matchId && !m.is_deleted)
            ?? throw new InvalidOperationException("match_not_found");

        match.is_deleted = true;
        match.updated = DateTime.UtcNow;

        var sets = await _db.match_set.Where(s => s.matchid == matchId).ToListAsync();
        _db.match_set.RemoveRange(sets);

        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---- standings --------------------------------------------------------

    // FIVB-style table: 3 points for a 3-0/3-1 win, 2 for a 3-2 win, 1 for a 2-3 loss, 0 otherwise.
    // Ranked by points, then wins, then set ratio, then point ratio.
    public async Task<List<StandingRT>> Standings(long tournamentId)
    {
        var entrants = await (from tt in _db.tournament_team.AsNoTracking()
                              join t in _db.team.AsNoTracking() on tt.teamid equals t.teamid
                              where tt.tournamentid == tournamentId
                              select new { t.teamid, t.name, t.logo, tt.pool })
                             .ToListAsync();
        if (entrants.Count == 0) return [];

        var matches = await _db.match.AsNoTracking()
            .Where(m => m.tournamentid == tournamentId && !m.is_deleted && m.status == 3)
            .ToListAsync();

        var matchIds = matches.Select(m => m.matchid).ToList();
        var sets = await _db.match_set.AsNoTracking()
            .Where(s => matchIds.Contains(s.matchid))
            .ToListAsync();
        var setsByMatch = sets.GroupBy(s => s.matchid).ToDictionary(g => g.Key, g => g.ToList());

        var table = entrants.ToDictionary(e => e.teamid, e => new StandingRT
        {
            teamid = e.teamid,
            teamname = e.name,
            logo = e.logo,
            pool = e.pool,
        });

        foreach (var match in matches)
        {
            if (!table.TryGetValue(match.hometeamid, out var home)) continue;
            if (!table.TryGetValue(match.awayteamid, out var away)) continue;

            home.played++;
            away.played++;
            home.sets_won += match.home_sets;
            home.sets_lost += match.away_sets;
            away.sets_won += match.away_sets;
            away.sets_lost += match.home_sets;

            if (setsByMatch.TryGetValue(match.matchid, out var matchSets))
            {
                foreach (var set in matchSets)
                {
                    home.points_won += set.home_points;
                    home.points_lost += set.away_points;
                    away.points_won += set.away_points;
                    away.points_lost += set.home_points;
                }
            }

            var (winner, loser) = match.home_sets > match.away_sets ? (home, away) : (away, home);
            var loserSets = Math.Min(match.home_sets, match.away_sets);

            winner.won++;
            loser.lost++;
            if (loserSets >= 2) { winner.points += 2; loser.points += 1; }
            else winner.points += 3;
        }

        var ordered = table.Values
            .Select(row =>
            {
                row.set_ratio = row.sets_lost == 0 ? row.sets_won : Math.Round((double)row.sets_won / row.sets_lost, 3);
                row.point_ratio = row.points_lost == 0 ? row.points_won : Math.Round((double)row.points_won / row.points_lost, 3);
                return row;
            })
            .OrderBy(r => r.pool)
            .ThenByDescending(r => r.points)
            .ThenByDescending(r => r.won)
            .ThenByDescending(r => r.set_ratio)
            .ThenByDescending(r => r.point_ratio)
            .ThenBy(r => r.teamname)
            .ToList();

        var position = 0;
        string? currentPool = null;
        foreach (var row in ordered)
        {
            if (row.pool != currentPool) { currentPool = row.pool; position = 0; }
            row.position = ++position;
        }

        return ordered;
    }

    // ---- dashboard --------------------------------------------------------

    public async Task<DashboardRT> Dashboard(int pendingMembers)
    {
        var now = DateTime.UtcNow;

        var next = await Matches(null, null, null, now, null);
        var results = await _db.match.AsNoTracking()
            .Where(m => !m.is_deleted && m.status == 3)
            .OrderByDescending(m => m.scheduled_at)
            .Take(5)
            .ToListAsync();

        return new DashboardRT
        {
            teams = await _db.team.CountAsync(t => !t.is_deleted && t.isactive),
            players = await _db.player.CountAsync(p => !p.is_deleted),
            tournaments = await _db.tournament.CountAsync(t => !t.is_deleted && t.status != 5),
            upcoming_matches = next.Count,
            pending_members = pendingMembers,
            next_matches = next.Take(5).ToList(),
            latest_results = await Decorate(results, includeSets: false),
        };
    }
}
