using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A dated note the coach keeps on one child: "ankle hurt, sat out", "moved up to the older group".
// Append-only from the UI; a wrong note is deleted, not edited, so the timeline stays honest.
public class StudentNote : IOwned
{
    [Key]
    public long noteid { get; set; }
    // The coach (account) this row belongs to.
    public int ownerid { get; set; }
    public long studentid { get; set; }
    public string body { get; set; } = string.Empty;
    public int staffid { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
}
