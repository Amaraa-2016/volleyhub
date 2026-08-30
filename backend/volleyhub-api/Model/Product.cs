using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// An item in the platform shop (balls, nets, protective gear). Public schema: the shop belongs to
// the platform, not to any training centre.
public class Product
{
    [Key]
    public long productid { get; set; }
    [MaxLength(300)]
    public string name { get; set; } = string.Empty;
    [MaxLength(100)]
    public string? category { get; set; }
    [MaxLength(200)]
    public string? brand { get; set; }
    public string? description { get; set; }
    public decimal price { get; set; }
    // Struck-through "was" price. Null when the item is not discounted.
    public decimal? old_price { get; set; }
    // Comma-separated image URLs. A separate table would buy nothing here: images are only ever
    // read as a set, in order, for one product.
    public string? images { get; set; }
    public int stock { get; set; }
    public bool isactive { get; set; } = true;
    public int sort_order { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
