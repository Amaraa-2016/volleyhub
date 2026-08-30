using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// What one student owes for one month of one group. `paid_amount` is recomputed from the payments
// attached to it, never written directly, so a deleted or corrected payment cannot leave a fee
// claiming to be settled.
public class StudentFee
{
    [Key]
    public long feeid { get; set; }
    public long studentid { get; set; }
    public long groupid { get; set; }
    // The billed month as YYYY-MM. A string rather than a date because it is a label, not an
    // instant, and it is what the uniqueness of a monthly fee is defined on.
    [MaxLength(7)]
    public string period { get; set; } = string.Empty;
    public decimal amount { get; set; }
    public decimal paid_amount { get; set; }
    public DateTime? due_date { get; set; }
    // 1=Unpaid, 2=Partly paid, 3=Paid, 4=Waived
    public short status { get; set; } = 1;
    [MaxLength(500)]
    public string? note { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
