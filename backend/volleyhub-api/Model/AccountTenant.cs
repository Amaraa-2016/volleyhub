using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// Membership of an account in a club. `status` = active | pending (a self-service join request an
// admin still has to approve). `staffid` points at the row materialised inside the tenant schema.
public class AccountTenant
{
    [Key]
    public int accounttenantid { get; set; }
    public int accountid { get; set; }
    public int tenantid { get; set; }
    // owner | admin | coach | player | fan
    [MaxLength(20)]
    public string role { get; set; } = "player";
    [MaxLength(20)]
    public string status { get; set; } = "active";
    public int staffid { get; set; }
    public DateTime joined { get; set; }
}
