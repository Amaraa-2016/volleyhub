using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// One dated class. Generated from a group's weekly timetable for a chosen date range, or added by
// hand for a one-off. Attendance attaches here rather than to the timetable, so cancelling or
// moving a single class leaves the recurring schedule untouched.
public class TrainingSession : IOwned
{
    [Key]
    public long sessionid { get; set; }
    // The coach (account) this row belongs to.
    public int ownerid { get; set; }
    public long groupid { get; set; }
    public long? venueid { get; set; }
    public int? coach_staffid { get; set; }
    // The calendar day of the class, stored at midnight UTC so date comparisons never straddle a
    // timezone boundary. The time of day lives in the two minute fields.
    public DateTime session_date { get; set; }
    public int start_minute { get; set; }
    public int end_minute { get; set; }
    // 1=Planned, 2=Held, 3=Cancelled
    public short status { get; set; } = 1;
    // Set once a coach saves attendance, which is what stops the generator from touching it.
    public bool attendance_taken { get; set; }
    public string? notes { get; set; }
    // Why a cancelled class did not happen ("Заал засвартай"), shown on the register and in texts.
    [System.ComponentModel.DataAnnotations.MaxLength(300)]
    public string? cancel_reason { get; set; }
    // For a make-up class: the cancelled class it replaces.
    public long? makeup_for { get; set; }
    // The lesson plan used for this class, if one was picked.
    public long? planid { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
