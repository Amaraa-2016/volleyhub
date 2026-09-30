using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A discount type the coach defines once ("Ах дүүгийн хөнгөлөлт 10%", "Тэтгэлэг 100%",
// "Ажилтны хүүхэд 20'000₮") and gives to children. Applied when a month's fee is created; the fee
// keeps the discount's name and amount so later edits to the type never rewrite past months.
public class Discount
{
    [Key]
    public long discountid { get; set; }
    [MaxLength(100)]
    public string name { get; set; } = string.Empty;
    // 1=Percent, 2=Fixed amount in ₮
    public short kind { get; set; } = 1;
    public decimal value { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
}
