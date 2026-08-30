using volleyhub_api.Model;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Data;

// Shared (public) schema: global identity, training-centre membership, registration applications,
// platform admins, and the platform's own content - volleyball news and the shop. Tenant-independent
// on purpose, so anonymous endpoints (the public site, login, register) work with no tenantid
// header. The tables are bootstrapped imperatively in TenantSchemaManager.EnsureAccountSchema(),
// so there are no migrations here.
public class AccountDbContext : DbContext
{
    public AccountDbContext(DbContextOptions<AccountDbContext> options) : base(options) { }

    // Identity and membership.
    public DbSet<Account> account { get; set; }
    public DbSet<AccountTenant> account_tenant { get; set; }
    public DbSet<Tenant> tenant { get; set; }
    public DbSet<TenantRequest> tenant_request { get; set; }
    public DbSet<PlatformAdmin> platform_admin { get; set; }

    // Platform content, shown on the public site.
    public DbSet<NewsPost> news_post { get; set; }
    public DbSet<Product> product { get; set; }
    public DbSet<ProductOrder> product_order { get; set; }
    public DbSet<ProductOrderItem> product_order_item { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("public");
        base.OnModelCreating(modelBuilder);
    }
}
