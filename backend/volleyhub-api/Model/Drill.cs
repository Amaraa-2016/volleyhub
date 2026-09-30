using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// One exercise in the coach's library: "Хосоор дамжуулалт", 15 minutes, works on setting.
// `skills` is a comma list of skill ids so the library can be filtered by what a child needs.
public class Drill
{
    [Key]
    public long drillid { get; set; }
    [MaxLength(200)]
    public string name { get; set; } = string.Empty;
    public string? description { get; set; }
    public int minutes { get; set; }
    // Free text, e.g. "8-10 нас", "Анхан шат".
    [MaxLength(100)]
    public string? level { get; set; }
    // What it needs: balls, cones, a net.
    [MaxLength(300)]
    public string? equipment { get; set; }
    [MaxLength(200)]
    public string? skills { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
