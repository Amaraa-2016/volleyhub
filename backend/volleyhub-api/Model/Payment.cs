using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// Money actually received against a fee. Kept as its own row rather than a column on the fee so
// part-payments and their history survive, which is what parents ask about.
public class Payment
{
    [Key]
    public long paymentid { get; set; }
    public long feeid { get; set; }
    public long studentid { get; set; }
    public decimal amount { get; set; }
    // 1=Cash, 2=Bank transfer, 3=Card, 4=Other
    public short method { get; set; } = 1;
    public DateTime paid_at { get; set; }
    public int received_by_staffid { get; set; }
    [MaxLength(500)]
    public string? note { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
}
