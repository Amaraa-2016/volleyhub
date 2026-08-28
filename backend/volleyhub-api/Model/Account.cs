using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// Global identity, shared by the backoffice and the mobile app. One row per phone number; which
// clubs the person belongs to (and in what role) lives in AccountTenant.
public class Account
{
    [Key]
    public int accountid { get; set; }
    [MaxLength(100)]
    public string phone { get; set; } = string.Empty;
    [MaxLength(500)]
    public string passwordhash { get; set; } = string.Empty;
    [MaxLength(500)]
    public string? name { get; set; }
    [MaxLength(250)]
    public string? lastname { get; set; }
    [MaxLength(250)]
    public string? firstname { get; set; }
    public bool isactive { get; set; } = true;
    public DateTime created { get; set; }
}
