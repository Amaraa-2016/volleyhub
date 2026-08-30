using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// One line of a shop enquiry. Name and price are copied from the product rather than joined at read
// time, so an order still reads correctly after the product is renamed, repriced or withdrawn.
public class ProductOrderItem
{
    [Key]
    public long orderitemid { get; set; }
    public long orderid { get; set; }
    public long productid { get; set; }
    [MaxLength(300)]
    public string product_name { get; set; } = string.Empty;
    public decimal price { get; set; }
    public int quantity { get; set; } = 1;
}
