using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A shop enquiry: the customer leaves what they want and how to reach them, and the platform
// follows up by phone. No payment is taken online, so there is no payment state to reconcile -
// `status` tracks the human conversation instead.
public class ProductOrder
{
    [Key]
    public long orderid { get; set; }
    // Set when the customer was logged in; anonymous orders are allowed and leave this at 0.
    public int accountid { get; set; }
    [MaxLength(200)]
    public string customer_name { get; set; } = string.Empty;
    [MaxLength(100)]
    public string phone { get; set; } = string.Empty;
    [MaxLength(500)]
    public string? address { get; set; }
    [MaxLength(1000)]
    public string? note { get; set; }
    // Copied from the lines at order time: today's price is what was quoted, and later price
    // changes must not rewrite an order already placed.
    public decimal total { get; set; }
    // 1=New, 2=Contacted, 3=Confirmed, 4=Delivered, 5=Cancelled
    public short status { get; set; } = 1;
    [MaxLength(500)]
    public string? admin_note { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
