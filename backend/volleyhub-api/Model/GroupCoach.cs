using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// Which coaches teach which course. A join table because a course routinely has more than one
// coach, and a coach teaches more than one course - neither side is a single value.
public class GroupCoach
{
    [Key]
    public long groupcoachid { get; set; }
    public long groupid { get; set; }
    public long coachid { get; set; }
}
