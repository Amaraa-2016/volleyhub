using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A competitive year. Tournaments hang off a season so standings and history can be filtered.
public class Season
{
    [Key]
    public long seasonid { get; set; }
    [MaxLength(200)]
    public string name { get; set; } = string.Empty;
    public DateTime startdate { get; set; }
    public DateTime enddate { get; set; }
    public bool isactive { get; set; } = true;
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
