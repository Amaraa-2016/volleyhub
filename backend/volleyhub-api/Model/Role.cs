using System.ComponentModel.DataAnnotations;

namespace volleyhub_api.Model;

// Reference data seeded into every tenant schema: 1=Admin, 2=Manager, 3=Coach, 4=Staff.
public class Role
{
    [Key]
    public int roleid { get; set; }
    [MaxLength(100)]
    public string rolename { get; set; } = string.Empty;
}
