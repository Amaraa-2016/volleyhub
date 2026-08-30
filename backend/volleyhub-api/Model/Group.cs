using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A training group: the unit a student actually enrolls in. Per-tenant (tenant_<id> schema), so
// there is no tenantid column. `fee_amount` is the standard monthly price; a student's own fee rows
// keep their agreed amount, so raising the group price never rewrites past invoices.
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
    public int? coach_staffid { get; set; }
    public long? venueid { get; set; }
    public int capacity { get; set; }
    public decimal fee_amount { get; set; }
    public string? notes { get; set; }
    public bool isactive { get; set; } = true;
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
