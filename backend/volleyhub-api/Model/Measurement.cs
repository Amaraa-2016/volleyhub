using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// Something the coach measures on children over time: height, weight, jump reach, a 20 m sprint.
// The coach owns the list, like skills. `higher_is_better` tells the chart which way is progress -
// a sprint time going down is good.
public class MeasureType : IOwned
{
    [Key]
    public long typeid { get; set; }
    // The coach (account) this row belongs to.
    public int ownerid { get; set; }
    [MaxLength(100)]
    public string name { get; set; } = string.Empty;
    [MaxLength(20)]
    public string unit { get; set; } = string.Empty;
    public bool higher_is_better { get; set; } = true;
    public int sort_order { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
}

public class Measurement : IOwned
{
    [Key]
    public long measureid { get; set; }
    // The coach (account) this row belongs to.
    public int ownerid { get; set; }
    public long studentid { get; set; }
    public long typeid { get; set; }
    public decimal value { get; set; }
    // Calendar day, midnight UTC like session dates.
    public DateTime measured_on { get; set; }
    [MaxLength(300)]
    public string? note { get; set; }
    public DateTime created { get; set; }
}
