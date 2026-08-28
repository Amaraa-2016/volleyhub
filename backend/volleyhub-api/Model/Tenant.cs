using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A club / league organisation. Lives in the public schema (cross-tenant registry); each tenant
// owns its own per-tenant schema (tenant_<tenantid>) holding all of its volleyball data.
public class Tenant
{
    [Key]
    public int tenantid { get; set; }
    [MaxLength(200)]
    public string tenantname { get; set; } = string.Empty;
    public bool isactive { get; set; } = true;

    // Profile fields filled in by self-service registration. Nullable so the seeded demo tenant
    // and the idempotent ALTER-based bootstrap stay valid.
    [MaxLength(100)]
    public string? registernumber { get; set; }
    [MaxLength(500)]
    public string? address { get; set; }
    [MaxLength(100)]
    public string? contactphone { get; set; }
    public string? logo { get; set; }
    [MaxLength(10)]
    public string? locale { get; set; }
    [MaxLength(3)]
    public string? currency { get; set; }
    public int? createdby { get; set; }
    public DateTime? created { get; set; }
}
