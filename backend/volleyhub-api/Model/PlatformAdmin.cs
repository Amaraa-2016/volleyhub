using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// Super admins of the platform itself — they review club registration applications. Membership is
// re-read from the database on every authorization check, so a stale JWT can never grant access.
public class PlatformAdmin
{
    [Key]
    public int platformadminid { get; set; }
    public int accountid { get; set; }
    [MaxLength(100)]
    public string phone { get; set; } = string.Empty;
    public DateTime created { get; set; }
}
