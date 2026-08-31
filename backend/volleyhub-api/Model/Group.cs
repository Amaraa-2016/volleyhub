using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A course the centre offers - the unit a student enrolls in, and the unit the public site lists.
// Per-tenant (tenant_<id> schema), so there is no tenantid column.
//
// Address, phone and map link live here rather than only on the centre: one organisation often
// runs courses in different halls, and a visitor is choosing a course at a place and time, not an
// organisation. `fee_amount` is the standard monthly price; a student's own fee rows keep the
// amount agreed at enrollment, so repricing a course never rewrites past invoices.
public class Group
{
    [Key]
    public long groupid { get; set; }
    [MaxLength(200)]
    public string name { get; set; } = string.Empty;
    // Free text: "Анхан шат", "Дунд шат", "U16" - training centres organise these very differently.
    [MaxLength(100)]
    public string? level { get; set; }
    [MaxLength(100)]
    public string? agegroup { get; set; }
    // 1=Male, 2=Female, 3=Mixed
    public short gender { get; set; } = 3;
    // Coaches are a list, not a column - see GroupCoach.
    public long? venueid { get; set; }
    public int capacity { get; set; }
    public decimal fee_amount { get; set; }
    public string? notes { get; set; }
    public bool isactive { get; set; } = true;

    // ---- public listing ---------------------------------------------------

    public string? cover { get; set; }
    // When the course starts taking students. Null for one that runs continuously.
    public DateTime? start_date { get; set; }
    [MaxLength(500)]
    public string? address { get; set; }
    // A share link pasted from Google Maps. Kept as the raw URL rather than parsed coordinates:
    // that is what someone actually has to hand, and the site only ever links out to it.
    [MaxLength(1000)]
    public string? map_url { get; set; }
    [MaxLength(100)]
    public string? phone { get; set; }

    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
