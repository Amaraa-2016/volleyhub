using System.Linq.Expressions;
using volleyhub_api.Model;
using volleyhub_api.Ownership;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Data;

// Every coach's data, in one shared schema (AppSchema.Name). Rows are kept apart by ownerid: a
// query filter on every IOwned table limits reads to the signed-in coach, and SaveChanges stamps
// new rows with them and refuses to move a row to another owner. Services therefore never filter
// by owner themselves - and cannot forget to.
public class VolleyDbContext : DbContext
{
    private readonly ICurrentOwner _owner;

    public VolleyDbContext(DbContextOptions<VolleyDbContext> options, ICurrentOwner owner) : base(options)
    {
        _owner = owner;
    }

    // Read by the query filters on every query (EF re-evaluates it per context instance).
    public int OwnerId => _owner.OwnerId;

    // Groups and the children in them. The table is training_group, not group, because group is a
    // reserved word in SQL and a contextual keyword in C# LINQ - both avoidable for free.
    public DbSet<Group> training_group { get; set; }
    public DbSet<Student> student { get; set; }
    public DbSet<Enrollment> enrollment { get; set; }

    // Where and when training happens.
    public DbSet<Venue> venue { get; set; }
    public DbSet<ScheduleEntry> schedule_entry { get; set; }
    public DbSet<TrainingSession> training_session { get; set; }
    public DbSet<AttendanceRecord> attendance_record { get; set; }

    // Money, as the coach records it from their bank statement.
    public DbSet<StudentFee> student_fee { get; set; }
    public DbSet<Payment> payment { get; set; }

    // Invoice texts sent to parents.
    public DbSet<FeeNotice> fee_notice { get; set; }

    // The coach's monthly skill scores and running notes on each child.
    public DbSet<Skill> skill { get; set; }
    public DbSet<SkillRating> skill_rating { get; set; }
    public DbSet<StudentNote> student_note { get; set; }

    // Lesson planning: the drill library and reusable plans.
    public DbSet<Drill> drill { get; set; }
    public DbSet<Plan> plan { get; set; }
    public DbSet<PlanItem> plan_item { get; set; }

    // Discount types given to children.
    public DbSet<Discount> discount { get; set; }

    // Physical development and health.
    public DbSet<MeasureType> measure_type { get; set; }
    public DbSet<Measurement> measurement { get; set; }
    public DbSet<Injury> injury { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(AppSchema.Name);

        foreach (var entity in modelBuilder.Model.GetEntityTypes().ToList())
        {
            if (!typeof(IOwned).IsAssignableFrom(entity.ClrType)) continue;

            // e => e.ownerid == this.OwnerId
            var e = Expression.Parameter(entity.ClrType, "e");
            var filter = Expression.Lambda(
                Expression.Equal(
                    Expression.Property(e, nameof(IOwned.ownerid)),
                    Expression.Property(Expression.Constant(this), nameof(OwnerId))),
                e);
            modelBuilder.Entity(entity.ClrType).HasQueryFilter(filter);
            modelBuilder.Entity(entity.ClrType).HasIndex(nameof(IOwned.ownerid));
        }

        base.OnModelCreating(modelBuilder);
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        StampOwner();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        StampOwner();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void StampOwner()
    {
        foreach (var entry in ChangeTracker.Entries<IOwned>())
        {
            if (entry.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted)) continue;
            if (OwnerId <= 0) throw new UnauthorizedAccessException("unauthorized");

            if (entry.State == EntityState.Added)
            {
                entry.Entity.ownerid = OwnerId;
            }
            else if (entry.Property(nameof(IOwned.ownerid)).OriginalValue is not int original || original != OwnerId)
            {
                // Only rows read through the filter can be tracked, so this is a bug or an attach of
                // a hand-built entity - never let it touch someone else's row.
                throw new UnauthorizedAccessException("not_owner");
            }
            else
            {
                entry.Entity.ownerid = OwnerId;
                entry.Property(nameof(IOwned.ownerid)).IsModified = false;
            }
        }
    }
}

// The one schema all coaches share.
public static class AppSchema
{
    public const string Name = "volleyhub";
}
