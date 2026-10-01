using volleyhub_api.Model;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Data;

// public.account: the coaches themselves. Needs no signed-in owner, so register and login use it.
// The table is bootstrapped in AppSchemaManager.EnsureAccountSchema(), so there are no migrations.
public class AccountDbContext : DbContext
{
    public AccountDbContext(DbContextOptions<AccountDbContext> options) : base(options) { }

    public DbSet<Account> account { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("public");
        base.OnModelCreating(modelBuilder);
    }
}
