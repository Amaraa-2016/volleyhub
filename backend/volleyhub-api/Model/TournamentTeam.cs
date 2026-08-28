using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A team entered into a tournament. Standings are computed from finished matches, never stored
// here, so a corrected score always produces a consistent table.
public class TournamentTeam
{
    [Key]
    public long tournamentteamid { get; set; }
    public long tournamentid { get; set; }
    public long teamid { get; set; }
    public int? seed { get; set; }
    // Group label for tournaments split into pools (A, B). Null = a single table.
    [MaxLength(20)]
    public string? pool { get; set; }
    public DateTime registered { get; set; }
}
