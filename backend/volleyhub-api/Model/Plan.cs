using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A reusable lesson plan: an ordered list of drills with minutes. A class session points at a plan
// (training_session.planid) instead of copying it, so improving a plan improves every future
// lesson that uses it.
public class Plan : IOwned
{
    [Key]
    public long planid { get; set; }
    // The coach (account) this row belongs to.
    public int ownerid { get; set; }
    [MaxLength(200)]
    public string name { get; set; } = string.Empty;
    public string? notes { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}

// One step of a plan. `title` is kept even when it comes from a drill, so a step still reads right
// after its drill is deleted - and a step can be plain text ("Ус уух завсарлага").
public class PlanItem : IOwned
{
    [Key]
    public long itemid { get; set; }
    // The coach (account) this row belongs to.
    public int ownerid { get; set; }
    public long planid { get; set; }
    public long? drillid { get; set; }
    [MaxLength(200)]
    public string title { get; set; } = string.Empty;
    public int minutes { get; set; }
    public int sort_order { get; set; }
}
