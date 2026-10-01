using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// One coach. Registration creates only this row - no tenant, no schema of their own: the coach's
// groups, children and money live in the shared app schema, tagged with this accountid (ownerid).
// The training's own details (name, bank account for invoices) are kept here too.
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
    // Uploaded by the person themselves; shown in the site header and on their profile.
    public string? photo { get; set; }
    // The training's name as parents see it on invoices and reports ("Од волейболын сургалт").
    [MaxLength(200)]
    public string? training_name { get; set; }
    [MaxLength(100)]
    public string? contactphone { get; set; }
    [MaxLength(100)]
    public string? bank_name { get; set; }
    [MaxLength(100)]
    public string? bank_account { get; set; }
    [MaxLength(200)]
    public string? bank_holder { get; set; }
    public bool isactive { get; set; } = true;
    public DateTime created { get; set; }
}
