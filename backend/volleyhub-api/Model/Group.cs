using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A group the coach trains - the unit a child is enrolled in, takes attendance in and is billed for.
// Per-tenant (tenant_<id> schema), so there is no tenantid column. `fee_amount` is the standard
// monthly price; a child's own fee rows keep the amount agreed at enrollment, so repricing a group
// never rewrites past months.
public class Group
{
    [Key]
    public long groupid { get; set; }
    [MaxLength(200)]
    public string name { get; set; } = string.Empty;
    // Free text: "Анхан шат", "Дунд шат", "U16" - training centres organise these very differently.
    [MaxLength(100)]
    public string? level { get; set; }
    [MaxLength(100)]
    public string? agegroup { get; set; }
    // 1=Male, 2=Female, 3=Mixed
    public short gender { get; set; } = 3;
    public long? venueid { get; set; }
    public int capacity { get; set; }
    public decimal fee_amount { get; set; }
    public string? notes { get; set; }
    public bool isactive { get; set; } = true;

    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
