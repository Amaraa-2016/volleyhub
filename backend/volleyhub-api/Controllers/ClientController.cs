using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Controllers;

// What the mobile app reads: a student's own schedule, attendance, fees and the centre's
// announcements. Open to every active member of the centre, so it carries no role gate - but it is
// read-only, and every endpoint is scoped to the caller's own student record rather than to
// whatever id they ask for.
[Authorize]
[ApiController]
[Route("api/vh/client")]
public class ClientController : ApiControllerBase
{
    private readonly ILogger<ClientController> _logger;
    private readonly TrainingService _training;
    private readonly ScheduleService _schedule;
    private readonly BillingService _billing;
    private readonly SharedDbContext _shared;

    protected override ILogger Logger => _logger;

    public ClientController(ILogger<ClientController> logger, TrainingService training,
        ScheduleService schedule, BillingService billing, SharedDbContext shared)
    {
        _logger = logger;
        _training = training;
        _schedule = schedule;
        _billing = billing;
        _shared = shared;
    }

    // The student record behind the caller's login. Everything else here hangs off it, which is
    // what keeps one student from reading another's attendance or fees.
    private async Task<StudentRT> Me()
    {
        return await _training.StudentByAccount(AccountId())
            ?? throw new InvalidOperationException("not_a_student");
    }

    [HttpGet("club")]
    public Task<IActionResult> Club() =>
        Run(async () =>
        {
            var tenantId = TenantId();
            var tenant = await _shared.tenant.AsNoTracking().FirstOrDefaultAsync(t => t.tenantid == tenantId)
                ?? throw new InvalidOperationException("training_not_found");
            return new
            {
                tenant.tenantid,
                tenant.tenantname,
                tenant.tagline,
                tenant.address,
                tenant.contactphone,
                tenant.logo,
                tenant.cover,
            };
        });

    // Profile card plus the next few classes of the group the caller is in.
    [HttpGet("me")]
    public Task<IActionResult> Profile() =>
        Run(async () =>
        {
            var student = await _training.StudentByAccount(AccountId());
            var upcoming = student?.groupid is long groupId
                ? (await _schedule.Sessions(groupId, DateTime.UtcNow.Date, DateTime.UtcNow.Date.AddDays(14), null))
                    .Where(s => s.status != 3).Take(5).ToList()
                : [];

            return new
            {
                role = Role(),
                student,
                next_sessions = upcoming,
            };
        });

    // The caller's own timetable. Defaults to the coming fortnight, which is what the schedule tab
    // shows without asking for a range.
    [HttpGet("sessions")]
    public Task<IActionResult> Sessions([FromQuery] DateTime? from, [FromQuery] DateTime? to) =>
        Run(async () =>
        {
            var student = await Me();
            if (student.groupid is not long groupId) return new List<SessionRT>();

            var start = from?.Date ?? DateTime.UtcNow.Date.AddDays(-7);
            var end = to?.Date ?? DateTime.UtcNow.Date.AddDays(14);
            return await _schedule.Sessions(groupId, start, end, null);
        });

    [HttpGet("attendance")]
    public Task<IActionResult> Attendance() =>
        Run(async () =>
        {
            var student = await Me();
            return await _schedule.StudentAttendance(student.studentid);
        });

    // Fees are read for the caller's own student id only - never for one supplied by the client.
    [HttpGet("fees")]
    public Task<IActionResult> Fees() =>
        Run(async () =>
        {
            var student = await Me();
            var fees = await _billing.Fees(null, student.studentid, null, null);
            return new
            {
                balance = fees.Where(f => f.status != 3 && f.status != 4).Sum(f => f.balance),
                fees,
            };
        });

    [HttpGet("announcements")]
    public Task<IActionResult> Announcements() =>
        Run(async () => await _training.Announcements(publishedOnly: true));
}
