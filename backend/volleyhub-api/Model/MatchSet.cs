using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// Points in one set of a match. set_no is 1-based; the deciding fifth set is the short one, to 15.
public class MatchSet
{
    [Key]
    public long matchsetid { get; set; }
    public long matchid { get; set; }
    public short set_no { get; set; }
    public short home_points { get; set; }
    public short away_points { get; set; }
}
