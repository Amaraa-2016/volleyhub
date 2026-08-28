namespace volleyhub_api.DTO;

// ---- teams ----------------------------------------------------------------

public class TeamBT
{
    public long teamid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? shortname { get; set; }
    public short gender { get; set; } = 1;
    public string? agegroup { get; set; }
    public string? division { get; set; }
    public int? coach_staffid { get; set; }
    public string? logo { get; set; }
    public string? notes { get; set; }
    public bool isactive { get; set; } = true;
}

public class TeamRT
{
    public long teamid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? shortname { get; set; }
    public short gender { get; set; }
    public string? agegroup { get; set; }
    public string? division { get; set; }
    public int? coach_staffid { get; set; }
    public string? coachname { get; set; }
    public string? logo { get; set; }
    public string? notes { get; set; }
    public bool isactive { get; set; }
    public int playercount { get; set; }
}

// ---- players --------------------------------------------------------------

public class PlayerBT
{
    public long playerid { get; set; }
    public string last_name { get; set; } = string.Empty;
    public string first_name { get; set; } = string.Empty;
    public DateTime? date_of_birth { get; set; }
    public short? gender { get; set; }
    public string? reg_no { get; set; }
    public string? phone { get; set; }
    public short? position { get; set; }
    public int? height_cm { get; set; }
    public int? reach_cm { get; set; }
    public string? photo { get; set; }
    public short status { get; set; } = 1;
    public string? notes { get; set; }
}

public class PlayerRT
{
    public long playerid { get; set; }
    public int accountid { get; set; }
    public string last_name { get; set; } = string.Empty;
    public string first_name { get; set; } = string.Empty;
    public DateTime? date_of_birth { get; set; }
    public short? gender { get; set; }
    public string? reg_no { get; set; }
    public string? phone { get; set; }
    public short? position { get; set; }
    public int? height_cm { get; set; }
    public int? reach_cm { get; set; }
    public string? photo { get; set; }
    public short status { get; set; }
    public string? notes { get; set; }
    // Current squad, when the player is on one.
    public long? teamid { get; set; }
    public string? teamname { get; set; }
    public int? jersey_no { get; set; }
    public bool is_captain { get; set; }
}

// ---- roster ---------------------------------------------------------------

public class RosterEntryBT
{
    public long playerid { get; set; }
    public int? jersey_no { get; set; }
    public bool is_captain { get; set; }
}

public class RosterEntryRT
{
    public long teamplayerid { get; set; }
    public long playerid { get; set; }
    public string last_name { get; set; } = string.Empty;
    public string first_name { get; set; } = string.Empty;
    public short? position { get; set; }
    public int? height_cm { get; set; }
    public int? jersey_no { get; set; }
    public bool is_captain { get; set; }
    public DateTime joined { get; set; }
    public short status { get; set; }
}

// ---- venues ---------------------------------------------------------------

public class VenueBT
{
    public long venueid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? address { get; set; }
    public int courts { get; set; } = 1;
    public string? contactphone { get; set; }
    public string? notes { get; set; }
}

// ---- announcements --------------------------------------------------------

public class AnnouncementBT
{
    public long announcementid { get; set; }
    public string title { get; set; } = string.Empty;
    public string? body { get; set; }
    public string? cover { get; set; }
    public bool publish { get; set; }
}

public class AnnouncementRT
{
    public long announcementid { get; set; }
    public string title { get; set; } = string.Empty;
    public string? body { get; set; }
    public string? cover { get; set; }
    public string? authorname { get; set; }
    public DateTime? published_at { get; set; }
    public DateTime created { get; set; }
}

// ---- dashboard ------------------------------------------------------------

public class DashboardRT
{
    public int teams { get; set; }
    public int players { get; set; }
    public int tournaments { get; set; }
    public int upcoming_matches { get; set; }
    public int pending_members { get; set; }
    public List<MatchRT> next_matches { get; set; } = new();
    public List<MatchRT> latest_results { get; set; } = new();
}
