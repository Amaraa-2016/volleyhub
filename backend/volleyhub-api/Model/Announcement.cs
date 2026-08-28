using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// Club news shown in the mobile app. Drafts (published_at null) stay backoffice-only.
public class Announcement
{
    [Key]
    public long announcementid { get; set; }
    [MaxLength(300)]
    public string title { get; set; } = string.Empty;
    public string? body { get; set; }
    public string? cover { get; set; }
    public int? author_staffid { get; set; }
    public DateTime? published_at { get; set; }
    public bool is_deleted { get; set; }
    public DateTime created { get; set; }
    public DateTime updated { get; set; }
}
