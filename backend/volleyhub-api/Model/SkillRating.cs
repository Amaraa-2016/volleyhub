using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// The coach's own 1-5 score of one child on one skill for one month. One row per
// (student, period, skill); re-rating a month overwrites it. Kept per month rather than per
// session because progress in children shows over weeks, and a monthly check is what a coach will
// actually keep up with.
public class SkillRating
{
    [Key]
    public long ratingid { get; set; }
    public long studentid { get; set; }
    // YYYY-MM, like a fee period.
    [MaxLength(7)]
    public string period { get; set; } = string.Empty;
    // 1=Serve (давшилт), 2=Receive (хүлээн авалт), 3=Set (дамжуулалт), 4=Attack (цохилт),
    // 5=Movement (хөдөлгөөн, биеийн бэлтгэл)
    public short skill { get; set; }
    // 1..5
    public short score { get; set; }
    [MaxLength(500)]
    public string? note { get; set; }
    public int rated_by_staffid { get; set; }
    public DateTime updated { get; set; }
}
