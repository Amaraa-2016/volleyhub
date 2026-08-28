using volleyhub_api.Model;
using volleyhub_api.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Data;

// Tenant context: every per-club table, scoped to that club's schema (tenant_<id>). Isolation is
// by schema, so the domain entities carry no tenantid column.
public class VolleyDbContext : DbContext, ITenantDbContext
{
    public string Schema { get; }

    public VolleyDbContext(DbContextOptions<VolleyDbContext> options, ITenantProvider tenantProvider) : base(options)
    {
        Schema = tenantProvider.GetSchema();
    }

    // Staff + roles.
    public DbSet<Role> role { get; set; }
    public DbSet<Staff> staff { get; set; }

    // Squads.
    public DbSet<Team> team { get; set; }
    public DbSet<Player> player { get; set; }
    public DbSet<TeamPlayer> team_player { get; set; }

    // Competition.
    public DbSet<Venue> venue { get; set; }
    public DbSet<Season> season { get; set; }
    public DbSet<Tournament> tournament { get; set; }
    public DbSet<TournamentTeam> tournament_team { get; set; }
    public DbSet<Match> match { get; set; }
    public DbSet<MatchSet> match_set { get; set; }

    // Content.
    public DbSet<Announcement> announcement { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(Schema);
        base.OnModelCreating(modelBuilder);
    }
}
