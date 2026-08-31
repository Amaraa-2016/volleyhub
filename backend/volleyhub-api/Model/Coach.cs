using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A teacher/coach profile. Deliberately separate from Staff: Staff is a login - the row that lets
// somebody sign in and manage the centre - while this is a public profile with a photo, a title and
// a biography. Most coaches never need an account, and the people who do are usually not the ones
// a visitor wants to read about.
public class Coach
{
    [Key]
    public long coachid { get; set; }
    [MaxLength(100)]
    public string last_name { get; set; } = string.Empty;
    [MaxLength(100)]
    public string first_name { get; set; } = string.Empty;
    public string? photo { get; set; }
    // Албан тушаал - "Ахлах дасгалжуулагч", "Багш".
    [MaxLength(200)]
    public string? position { get; set; }
    // Цол зэрэг - "Олон улсын хэмжээний мастер", "Спортын мастер".
    [MaxLength(200)]
    public string? rank { get; set; }
    public string? bio { get; set; }
    [MaxLength(100)]
    public string? phone { get; set; }
    public bool isactive { get; set; } = true;
    public int sort_order { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
