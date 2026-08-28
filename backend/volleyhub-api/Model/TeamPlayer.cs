using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// Roster entry: one spell of a player in one team. History is kept (left_at set instead of the row
// being deleted), so past squads stay reconstructable.
public class TeamPlayer
{
    [Key]
    public long teamplayerid { get; set; }
    public long teamid { get; set; }
    public long playerid { get; set; }
    public int? jersey_no { get; set; }
    public bool is_captain { get; set; }
    public DateTime joined { get; set; }
    public DateTime? left_at { get; set; }
    public bool isactive { get; set; } = true;
}
