using volleyhub_api.Model;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Data;

// Shared (public) schema: the cross-tenant club registry only.
public class SharedDbContext : DbContext
{
    public SharedDbContext(DbContextOptions<SharedDbContext> options) : base(options) { }

    public DbSet<Tenant> tenant { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("public");
        base.OnModelCreating(modelBuilder);
    }
}
