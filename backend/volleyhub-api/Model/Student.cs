using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A child the coach trains. Children and parents never log in; `accountid` is kept only so rows
// created by the earlier mobile app still load (0 for everyone the coach adds).
public class Student
{
    [Key]
    public long studentid { get; set; }
    public int accountid { get; set; }
    [MaxLength(100)]
    public string last_name { get; set; } = string.Empty;
    [MaxLength(100)]
    public string first_name { get; set; } = string.Empty;
    public DateTime? date_of_birth { get; set; }
    // What the coach actually asks for: the year of birth. Age is worked out from it on screen, so
    // it never goes stale the way a typed-in age would.
    public int? birth_year { get; set; }
    // 1=Male, 2=Female
    public short? gender { get; set; }
    [MaxLength(100)]
    public string? phone { get; set; }
    // Who to call if something happens at training - a parent for a child, anyone the adult names.
    [MaxLength(100)]
    public string? emergency_name { get; set; }
    // How they are related: аав, ээж, ах, эгч, нөхөр...
    [MaxLength(50)]
    public string? emergency_relation { get; set; }
    [MaxLength(100)]
    public string? emergency_phone { get; set; }
    public int? height_cm { get; set; }
    public string? photo { get; set; }
    // 1=Active, 2=Paused, 3=Left. Left needs left_date - the backend refuses one without it.
    public short status { get; set; } = 1;
    // When the child started training and, once they stop, when they left.
    public DateTime? start_date { get; set; }
    public DateTime? left_date { get; set; }
    public string? notes { get; set; }
    // The text the coach asked the parent to put in the transfer description ("Бат 10"), so the
    // child's payment is easy to find in the bank statement.
    [MaxLength(100)]
    public string? pay_ref { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
