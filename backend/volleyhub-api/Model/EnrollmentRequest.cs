using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// Someone on the public site asking to join one course. It lives in the centre's own schema, next
// to the students it turns into: the centre is who acts on it, and nobody else may read it.
//
// The applicant's name and phone are copied in rather than joined from the account table - that
// table is in the public schema, and the centre needs to see who is asking without a cross-schema
// query on every list.
public class EnrollmentRequest
{
    [Key]
    public long requestid { get; set; }
    public long groupid { get; set; }
    // The public-schema account that asked. Approving links the student row to it, which is what
    // lets the person see their own schedule, attendance and fees in the mobile app.
    public int accountid { get; set; }
    [MaxLength(100)]
    public string last_name { get; set; } = string.Empty;
    [MaxLength(100)]
    public string first_name { get; set; } = string.Empty;
    [MaxLength(100)]
    public string? phone { get; set; }
    // Free text from the applicant - which child, what experience, when they can attend.
    public string? note { get; set; }
    // 1=Pending, 2=Approved, 3=Rejected
    public short status { get; set; } = 1;
    // The centre's reason, shown back to the applicant when rejected.
    public string? decision_note { get; set; }
    // The student row this became, once approved.
    public long? studentid { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
