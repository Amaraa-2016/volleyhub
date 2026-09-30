using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// An injury the coach recorded: when, what, and whether the child is back to full training.
// An open one (status 1) shows as a warning wherever the child's name does - the register, the
// class list - so nobody is put through a drill they should sit out.
public class Injury
{
    [Key]
    public long injuryid { get; set; }
    public long studentid { get; set; }
    public DateTime occurred_on { get; set; }
    [MaxLength(100)]
    public string? body_part { get; set; }
    public string description { get; set; } = string.Empty;
    // 1=Recovering, 2=Recovered
    public short status { get; set; } = 1;
    public DateTime? recovered_on { get; set; }
    public int staffid { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
}
