using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// A training centre. Lives in the public schema (the cross-tenant registry); each one owns a
// tenant_<tenantid> schema holding its groups, students, schedule, attendance and fees.
//
// The profile fields below are what the public site shows in the trainings directory. They are
// separate from the operational data on purpose: a centre can be listed and searchable before it
// has entered a single student.
public class Tenant
{
    [Key]
    public int tenantid { get; set; }
    [MaxLength(200)]
    public string tenantname { get; set; } = string.Empty;
    public bool isactive { get; set; } = true;

    // Registration details, captured when the centre applied.
    [MaxLength(100)]
    public string? registernumber { get; set; }
    [MaxLength(500)]
    public string? address { get; set; }
    [MaxLength(100)]
    public string? contactphone { get; set; }
    public string? logo { get; set; }
    [MaxLength(10)]
    public string? locale { get; set; }
    [MaxLength(3)]
    public string? currency { get; set; }
    public int? createdby { get; set; }
    public DateTime? created { get; set; }

    // ---- public profile ---------------------------------------------------

    // Short line under the name in the directory listing.
    [MaxLength(500)]
    public string? tagline { get; set; }
    public string? description { get; set; }
    public string? cover { get; set; }
    // Comma-separated image URLs of the hall, sessions, and so on.
    public string? photos { get; set; }
    [MaxLength(100)]
    public string? city { get; set; }
    [MaxLength(100)]
    public string? district { get; set; }
    [MaxLength(100)]
    public string? email { get; set; }
    [MaxLength(300)]
    public string? website { get; set; }
    [MaxLength(300)]
    public string? facebook { get; set; }
    [MaxLength(300)]
    public string? instagram { get; set; }
    // Cheapest monthly fee, for the "from ₮X" line in the listing. Kept as a plain number the
    // centre types in rather than derived from group prices, which may include one-off courses.
    public decimal? price_from { get; set; }
    public int? age_from { get; set; }
    public int? age_to { get; set; }
    // Map pin, so the directory can show where the hall is.
    public double? latitude { get; set; }
    public double? longitude { get; set; }
    // Whether the centre appears in the public directory at all. Approval creates the tenant; the
    // owner decides when the profile is ready to be seen.
    public bool is_published { get; set; }
}
