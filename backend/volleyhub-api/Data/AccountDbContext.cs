using volleyhub_api.Model;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Data;

// Shared (public) schema: global identity, club membership, registration applications, platform
// admins. Tenant-independent on purpose, so anonymous endpoints (login, register) work with no
// tenantid header. The tables are bootstrapped imperatively in
// TenantSchemaManager.EnsureAccountSchema(), so there are no migrations here.
public class AccountDbContext : DbContext
{
    public AccountDbContext(DbContextOptions<AccountDbContext> options) : base(options) { }

    public DbSet<Account> account { get; set; }
    public DbSet<AccountTenant> account_tenant { get; set; }
    public DbSet<Tenant> tenant { get; set; }
    public DbSet<TenantRequest> tenant_request { get; set; }
    public DbSet<PlatformAdmin> platform_admin { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("public");
        base.OnModelCreating(modelBuilder);
    }
}
