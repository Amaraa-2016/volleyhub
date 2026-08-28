using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// An application to register a club. Kept out of public.tenant on purpose: a tenant row is only
// inserted once the request is approved, so "a tenant exists" always means "it is live".
public class TenantRequest
{
    [Key]
    public int tenantrequestid { get; set; }
    public int accountid { get; set; }
    [MaxLength(200)]
    public string tenantname { get; set; } = string.Empty;
    [MaxLength(100)]
    public string? registernumber { get; set; }
    [MaxLength(500)]
    public string? address { get; set; }
    [MaxLength(100)]
    public string? contactphone { get; set; }
    // pending | approved | rejected
    [MaxLength(20)]
    public string status { get; set; } = "pending";
    [MaxLength(500)]
    public string? note { get; set; }
    public int? tenantid { get; set; }
    public int? reviewedby { get; set; }
    public DateTime? reviewedat { get; set; }
    public DateTime created { get; set; }
}
