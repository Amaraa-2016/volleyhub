using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// Someone attending the training centre. `accountid` links them to a mobile login when they have
// one (0 = no linked account yet, e.g. a child registered by a coach or a parent).
public class Student
{
    [Key]
    public long studentid { get; set; }
    public int accountid { get; set; }
    [MaxLength(100)]
    public string last_name { get; set; } = string.Empty;
    [MaxLength(100)]
    public string first_name { get; set; } = string.Empty;
    public DateTime? date_of_birth { get; set; }
    // 1=Male, 2=Female
    public short? gender { get; set; }
    [MaxLength(20)]
    public string? reg_no { get; set; }
    [MaxLength(100)]
    public string? phone { get; set; }
    // Guardian contact, for under-age students.
    [MaxLength(100)]
    public string? parent_name { get; set; }
    [MaxLength(100)]
    public string? parent_phone { get; set; }
    public int? height_cm { get; set; }
    public string? photo { get; set; }
    // 1=Active, 2=Paused, 3=Left
    public short status { get; set; } = 1;
    public string? notes { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
