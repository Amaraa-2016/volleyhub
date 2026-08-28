using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A hall the club plays or trains in.
public class Venue
{
    [Key]
    public long venueid { get; set; }
    [MaxLength(200)]
    public string name { get; set; } = string.Empty;
    [MaxLength(500)]
    public string? address { get; set; }
    public int courts { get; set; } = 1;
    [MaxLength(100)]
    public string? contactphone { get; set; }
    public string? notes { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
