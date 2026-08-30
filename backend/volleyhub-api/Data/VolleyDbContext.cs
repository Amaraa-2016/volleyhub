using volleyhub_api.Model;
using volleyhub_api.Tenancy;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Data;

// Tenant context: every per-training-centre table, scoped to that centre's schema (tenant_<id>).
// Isolation is by schema, so the domain entities carry no tenantid column.
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

    // Groups and the students in them. The table is training_group, not group, because group is a
    // reserved word in SQL and a contextual keyword in C# LINQ - both avoidable for free.
    public DbSet<Group> training_group { get; set; }
    public DbSet<Student> student { get; set; }
    public DbSet<Enrollment> enrollment { get; set; }

    // Where and when training happens.
    public DbSet<Venue> venue { get; set; }
    public DbSet<ScheduleEntry> schedule_entry { get; set; }
    public DbSet<TrainingSession> training_session { get; set; }
    public DbSet<AttendanceRecord> attendance_record { get; set; }

    // Money.
    public DbSet<StudentFee> student_fee { get; set; }
    public DbSet<Payment> payment { get; set; }

    // The centre talking to its own students.
    public DbSet<Announcement> announcement { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(Schema);
        base.OnModelCreating(modelBuilder);
    }
}
