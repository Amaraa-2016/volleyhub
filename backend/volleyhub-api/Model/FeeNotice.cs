using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// One invoice text sent (or attempted) to a parent for one fee. Kept so the fee list can show
// "sent on the 3rd" and a coach never double-sends by accident.
public class FeeNotice : IOwned
{
    [Key]
    public long noticeid { get; set; }
    // The coach (account) this row belongs to.
    public int ownerid { get; set; }
    public long feeid { get; set; }
    public long studentid { get; set; }
    [MaxLength(100)]
    public string phone { get; set; } = string.Empty;
    public string message { get; set; } = string.Empty;
    // 1=Sent by the gateway, 2=Failed, 3=Logged only (no gateway), 4=Opened in the coach's own
    // phone messaging app (we cannot know if they pressed send, but they chose to)
    public short status { get; set; }
    [MaxLength(500)]
    public string? error { get; set; }
    public int staffid { get; set; }
    public DateTime created { get; set; }
}
