using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// One thing the coach scores children on each month ("Давшилт", "Хүлээн авалт"...). The coach
// owns the list: adds, renames, reorders, retires. A retired skill keeps its past scores - it is
// soft-deleted, never removed - so old months still read correctly.
//
// The id is a smallint because skill_rating.skill already is one: the five skills the app used to
// have built in were numbered 1..5, and seeding an empty table in that same order gives them the
// same ids, so scores given before this table existed attach to the right names.
public class Skill : IOwned
{
    [Key]
    public int skillid { get; set; }
    // The coach (account) this row belongs to.
    public int ownerid { get; set; }
    [MaxLength(100)]
    public string name { get; set; } = string.Empty;
    // A short second line, e.g. the English term the coach learned it by.
    [MaxLength(100)]
    public string? hint { get; set; }
    public int sort_order { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
}
