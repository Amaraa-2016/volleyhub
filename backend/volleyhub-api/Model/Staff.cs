using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A person who works for the club (admin, manager, coach). Materialised inside the tenant schema
// when an account joins, so every tenant-scoped endpoint can resolve a real staff row from the JWT.
public class Staff
{
    [Key]
    public int staffid { get; set; }
    public int accountid { get; set; }
    [MaxLength(100)]
    public string phone { get; set; } = string.Empty;
    [MaxLength(500)]
    public string? staffname { get; set; }
    [MaxLength(250)]
    public string? lastname { get; set; }
    [MaxLength(250)]
    public string? firstname { get; set; }
    [MaxLength(500)]
    public string? password { get; set; }
    public int roleid { get; set; } = 1;
    public bool isactive { get; set; } = true;
    public int tenantid { get; set; }
    public DateTime created { get; set; }
}
