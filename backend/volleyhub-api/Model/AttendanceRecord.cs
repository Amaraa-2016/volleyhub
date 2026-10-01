using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// One student's attendance at one class. Rows exist only for classes whose attendance has been
// taken; a student with no row for a past class simply was not marked, which reads differently
// from being marked absent.
public class AttendanceRecord : IOwned
{
    [Key]
    public long attendanceid { get; set; }
    // The coach (account) this row belongs to.
    public int ownerid { get; set; }
    public long sessionid { get; set; }
    public long studentid { get; set; }
    // 1=Present, 2=Absent, 3=Excused, 4=Late
    public short status { get; set; } = 1;
    [MaxLength(500)]
    public string? note { get; set; }
    public int marked_by_staffid { get; set; }
    public DateTime marked_at { get; set; }
}
