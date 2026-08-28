using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A registered player. accountid links the player to a mobile-app login when they have one
// (0 = no linked account yet, e.g. a junior registered by a coach).
public class Player
{
    [Key]
    public long playerid { get; set; }
    public int accountid { get; set; }
    [MaxLength(100)]
    public string last_name { get; set; } = string.Empty;
    [MaxLength(100)]
    public string first_name { get; set; } = string.Empty;
    public DateTime? date_of_birth { get; set; }
    // 1=Male, 2=Female
    public short? gender { get; set; }
    [MaxLength(20)]
    public string? reg_no { get; set; }
    [MaxLength(100)]
    public string? phone { get; set; }
    // 1=Outside hitter, 2=Opposite, 3=Setter, 4=Middle blocker, 5=Libero, 6=Defensive specialist
    public short? position { get; set; }
    public int? height_cm { get; set; }
    public int? reach_cm { get; set; }
    public string? photo { get; set; }
    // 1=Active, 2=Injured, 3=Inactive
    public short status { get; set; } = 1;
    public string? notes { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
