using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// Platform-level volleyball news shown on the public site. Lives in the public schema and is
// written by platform admins - deliberately NOT the same thing as Announcement, which is one
// training centre talking to its own students.
public class NewsPost
{
    [Key]
    public long newsid { get; set; }
    [MaxLength(300)]
    public string title { get; set; } = string.Empty;
    // Short teaser for the listing; the body is only loaded on the detail page.
    [MaxLength(1000)]
    public string? summary { get; set; }
    public string? body { get; set; }
    public string? cover { get; set; }
    // 1=World, 2=Mongolia, 3=Platform
    public short category { get; set; } = 2;
    // Attribution when the item is based on someone else's reporting.
    [MaxLength(200)]
    public string? source { get; set; }
    [MaxLength(500)]
    public string? source_url { get; set; }
    // Null means draft: invisible on the public site, visible in the console.
    public DateTime? published_at { get; set; }
    public int? author_accountid { get; set; }
    public int view_count { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
