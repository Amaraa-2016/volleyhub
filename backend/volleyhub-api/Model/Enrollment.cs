using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// One spell of a student in one group. Leaving sets left_at rather than deleting the row, so past
// rosters and the attendance attached to them stay reconstructable.
public class Enrollment : IOwned
{
    [Key]
    public long enrollmentid { get; set; }
    // The coach (account) this row belongs to.
    public int ownerid { get; set; }
    public long groupid { get; set; }
    public long studentid { get; set; }
    // The price agreed for this student, copied from the group at enrollment. Kept here so raising
    // the group price later never rewrites what an existing student owes.
    public decimal fee_amount { get; set; }
    public DateTime joined { get; set; }
    public DateTime? left_at { get; set; }
    public bool isactive { get; set; } = true;
}
