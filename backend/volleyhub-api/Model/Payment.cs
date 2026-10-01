using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// Money the coach has confirmed as received against a fee - usually after spotting the transfer in
// their own bank statement. The app never moves money; a payment row is the coach's note that it
// arrived. Kept as its own row rather than a column on the fee so part-payments and their history
// survive, and "undo" is just deleting the row.
public class Payment : IOwned
{
    [Key]
    public long paymentid { get; set; }
    // The coach (account) this row belongs to.
    public int ownerid { get; set; }
    public long feeid { get; set; }
    public long studentid { get; set; }
    public decimal amount { get; set; }
    // 1=Cash, 2=Bank transfer, 3=Card, 4=Other
    public short method { get; set; } = 1;
    public DateTime paid_at { get; set; }
    public int received_by_staffid { get; set; }
    // The name as it appeared on the bank statement ("Д.Сараа"), so a later "did they pay?" can be
    // answered by searching the statement for the same line.
    [MaxLength(200)]
    public string? payer { get; set; }
    [MaxLength(500)]
    public string? note { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
}
