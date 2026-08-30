using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// The recurring weekly timetable of a group: "Mondays 18:00-19:30 in hall 2". Actual dated
// classes are TrainingSession rows generated from these, which is what attendance hangs off -
// so cancelling one class never has to touch the timetable.
public class ScheduleEntry
{
    [Key]
    public long scheduleid { get; set; }
    public long groupid { get; set; }
    public long? venueid { get; set; }
    // 0=Sunday .. 6=Saturday, matching DayOfWeek so no conversion is needed anywhere.
    public short weekday { get; set; }
    // Minutes from midnight, local time. Stored as an int rather than a time column because the
    // value is a wall-clock slot, not an instant: it must not shift with timezones or DST.
    public int start_minute { get; set; }
    public int end_minute { get; set; }
    public bool isactive { get; set; } = true;
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
