namespace volleyhub_api.DTO;

// ---- seasons --------------------------------------------------------------

public class SeasonBT
{
    public long seasonid { get; set; }
    public string name { get; set; } = string.Empty;
    public DateTime startdate { get; set; }
    public DateTime enddate { get; set; }
    public bool isactive { get; set; } = true;
}

// ---- tournaments ----------------------------------------------------------

public class TournamentBT
{
    public long tournamentid { get; set; }
    public long? seasonid { get; set; }
    public string name { get; set; } = string.Empty;
    public short format { get; set; } = 1;
    public short gender { get; set; } = 1;
    public DateTime startdate { get; set; }
    public DateTime enddate { get; set; }
    public long? venueid { get; set; }
    public short status { get; set; } = 1;
    public short best_of { get; set; } = 5;
    public string? notes { get; set; }
}

public class TournamentRT
{
    public long tournamentid { get; set; }
    public long? seasonid { get; set; }
    public string? seasonname { get; set; }
    public string name { get; set; } = string.Empty;
    public short format { get; set; }
    public short gender { get; set; }
    public DateTime startdate { get; set; }
    public DateTime enddate { get; set; }
    public long? venueid { get; set; }
    public string? venuename { get; set; }
    public short status { get; set; }
    public short best_of { get; set; }
    public string? notes { get; set; }
    public int teamcount { get; set; }
    public int matchcount { get; set; }
}

public class TournamentTeamBT
{
    public long teamid { get; set; }
    public int? seed { get; set; }
    public string? pool { get; set; }
}

public class TournamentTeamRT
{
    public long tournamentteamid { get; set; }
    public long teamid { get; set; }
    public string teamname { get; set; } = string.Empty;
    public string? logo { get; set; }
    public int? seed { get; set; }
    public string? pool { get; set; }
}

// ---- matches --------------------------------------------------------------

public class MatchBT
{
    public long matchid { get; set; }
    public long tournamentid { get; set; }
    public long hometeamid { get; set; }
    public long awayteamid { get; set; }
    public long? venueid { get; set; }
    public DateTime scheduled_at { get; set; }
    public string? round { get; set; }
    public short status { get; set; } = 1;
    public string? notes { get; set; }
}

public class MatchSetBT
{
    public short set_no { get; set; }
    public short home_points { get; set; }
    public short away_points { get; set; }
}

// Entering a result replaces every set of the match in one go, so a correction is just a re-post.
public class MatchResultBT
{
    public List<MatchSetBT> sets { get; set; } = new();
    public string? notes { get; set; }
}

public class MatchSetRT
{
    public short set_no { get; set; }
    public short home_points { get; set; }
    public short away_points { get; set; }
}

public class MatchRT
{
    public long matchid { get; set; }
    public long tournamentid { get; set; }
    public string? tournamentname { get; set; }
    public long hometeamid { get; set; }
    public string hometeamname { get; set; } = string.Empty;
    public string? homelogo { get; set; }
    public long awayteamid { get; set; }
    public string awayteamname { get; set; } = string.Empty;
    public string? awaylogo { get; set; }
    public long? venueid { get; set; }
    public string? venuename { get; set; }
    public DateTime scheduled_at { get; set; }
    public string? round { get; set; }
    public short status { get; set; }
    public short home_sets { get; set; }
    public short away_sets { get; set; }
    public string? notes { get; set; }
    public List<MatchSetRT> sets { get; set; } = new();
}

// ---- standings ------------------------------------------------------------

// One row of a league table. Volleyball scoring: a 3-0 or 3-1 win is 3 points, a 3-2 win is 2 and
// the 2-3 loss is 1, everything else 0. Ties are broken by points, then wins, then set ratio, then
// point ratio - the order used by most federations.
public class StandingRT
{
    public int position { get; set; }
    public long teamid { get; set; }
    public string teamname { get; set; } = string.Empty;
    public string? logo { get; set; }
    public string? pool { get; set; }
    public int played { get; set; }
    public int won { get; set; }
    public int lost { get; set; }
    public int sets_won { get; set; }
    public int sets_lost { get; set; }
    public double set_ratio { get; set; }
    public int points_won { get; set; }
    public int points_lost { get; set; }
    public double point_ratio { get; set; }
    public int points { get; set; }
}
