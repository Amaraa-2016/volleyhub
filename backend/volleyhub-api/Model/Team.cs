using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A squad the club fields. Per-tenant (tenant_<id> schema), so no tenantid column.
public class Team
{
    [Key]
    public long teamid { get; set; }
    [MaxLength(200)]
    public string name { get; set; } = string.Empty;
    [MaxLength(100)]
    public string? shortname { get; set; }
    // 1=Men, 2=Women, 3=Mixed
    public short gender { get; set; } = 1;
    // Free text: U16, Senior, Div A - clubs organise these very differently.
    [MaxLength(100)]
    public string? agegroup { get; set; }
    [MaxLength(100)]
    public string? division { get; set; }
    public int? coach_staffid { get; set; }
    public string? logo { get; set; }
    public string? notes { get; set; }
    public bool isactive { get; set; } = true;
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
