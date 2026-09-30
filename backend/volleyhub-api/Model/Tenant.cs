using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// One coach's workspace. Lives in the public schema (the cross-tenant registry); each one owns a
// tenant_<tenantid> schema holding its groups, children, schedule, attendance and fees. Created
// automatically when a coach registers - there is no application or approval step.
public class Tenant
{
    [Key]
    public int tenantid { get; set; }
    [MaxLength(200)]
    public string tenantname { get; set; } = string.Empty;
    public bool isactive { get; set; } = true;

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

    // Where parents pay, printed on every invoice text.
    [MaxLength(100)]
    public string? bank_name { get; set; }
    [MaxLength(100)]
    public string? bank_account { get; set; }
    [MaxLength(200)]
    public string? bank_holder { get; set; }
}
