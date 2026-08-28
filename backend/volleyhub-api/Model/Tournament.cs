using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A competition inside a season: a round-robin league, a knockout cup, or a friendly series.
public class Tournament
{
    [Key]
    public long tournamentid { get; set; }
    public long? seasonid { get; set; }
    [MaxLength(200)]
    public string name { get; set; } = string.Empty;
    // 1=League (round robin), 2=Knockout, 3=Friendly
    public short format { get; set; } = 1;
    // 1=Men, 2=Women, 3=Mixed
    public short gender { get; set; } = 1;
    public DateTime startdate { get; set; }
    public DateTime enddate { get; set; }
    public long? venueid { get; set; }
    // 1=Draft, 2=Published, 3=Ongoing, 4=Finished, 5=Cancelled
    public short status { get; set; } = 1;
    // Best of how many sets: 5 for a full match, 3 for youth and short formats. Drives the
    // sets-to-win rule enforced when a result is entered.
    public short best_of { get; set; } = 5;
    public string? notes { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
