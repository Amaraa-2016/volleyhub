using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// One fixture. home_sets/away_sets are derived from the match_set rows whenever a result is saved,
// so a fixture listing never has to load the per-set detail.
public class Match
{
    [Key]
    public long matchid { get; set; }
    public long tournamentid { get; set; }
    public long hometeamid { get; set; }
    public long awayteamid { get; set; }
    public long? venueid { get; set; }
    public DateTime scheduled_at { get; set; }
    // Free text: Round 1, Semi-final.
    [MaxLength(100)]
    public string? round { get; set; }
    // 1=Scheduled, 2=Live, 3=Finished, 4=Cancelled, 5=Postponed
    public short status { get; set; } = 1;
    public short home_sets { get; set; }
    public short away_sets { get; set; }
    public string? notes { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
