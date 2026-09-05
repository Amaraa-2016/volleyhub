using volleyhub_api.DTO;
using volleyhub_api.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace volleyhub_api.Controllers;

// Training-centre management. Every endpoint is per-centre: the tenantid header selects the schema
// and the tenant provider checks the caller is a member of it, so nothing here filters by tenant
// itself. The role gate below is the second half of that - membership alone must not let a student
// edit the roster.
[Authorize]
[ApiController]
[Route("api/vh/backoffice")]
public class BackofficeController : ApiControllerBase
{
    private readonly ILogger<BackofficeController> _logger;
    private readonly TrainingService _training;
    private readonly ScheduleService _schedule;
    private readonly BillingService _billing;
    private readonly AccountService _account;
    private readonly PublicSiteService _site;

    protected override ILogger Logger => _logger;

    private static readonly string[] ManageRoles = ["owner", "admin"];
    private static readonly string[] StaffRoles = ["owner", "admin", "coach"];

    public BackofficeController(ILogger<BackofficeController> logger, TrainingService training,
        ScheduleService schedule, BillingService billing, AccountService account, PublicSiteService site)
    {
        _logger = logger;
        _training = training;
        _schedule = schedule;
        _billing = billing;
        _account = account;
        _site = site;
    }

    // A coach may read everything, take the register and enter payments; changing the centre itself
    // needs owner/admin.
    private void AssertStaff()
    {
        if (!StaffRoles.Contains(Role())) throw new UnauthorizedAccessException("staff_only");
    }

    private void AssertManager()
    {
        if (!ManageRoles.Contains(Role())) throw new UnauthorizedAccessException("admin_only");
    }

    // ---- dashboard --------------------------------------------------------

    [HttpGet("dashboard")]
    public Task<IActionResult> Dashboard() =>
        Run(async () =>
        {
            AssertStaff();

            var today = DateTime.UtcNow.Date;
            var upcoming = await _schedule.Sessions(null, today, today.AddDays(7), null);
            var pending = (await _account.Members(TenantId(), "pending")).Count;
            var (owed, debtors) = await _billing.Outstanding();

            return new DashboardRT
            {
                groups = (await _training.Groups()).Count,
                students = (await _training.Students(null, null)).Count,
                sessions_this_week = upcoming.Count,
                pending_members = pending,
                unpaid_total = owed,
                unpaid_students = debtors,
                next_sessions = upcoming.Where(s => s.status != 3).Take(6).ToList(),
            };
        });

    // ---- public profile of this centre ------------------------------------

    [HttpGet("profile")]
    public Task<IActionResult> Profile() =>
        Run(async () => { AssertStaff(); return await _site.Profile(TenantId()); });

    [HttpPut("profile")]
    public Task<IActionResult> SaveProfile([FromBody] TrainingProfileBT data) =>
        Run(async () => { AssertManager(); return await _site.SaveProfile(TenantId(), data); });

    // ---- groups -----------------------------------------------------------

    [HttpGet("groups")]
    public Task<IActionResult> Groups([FromQuery] bool includeInactive = false) =>
        Run(async () => { AssertStaff(); return await _training.Groups(includeInactive); });

    [HttpGet("groups/{id:long}")]
    public Task<IActionResult> Group(long id) =>
        Run(async () => { AssertStaff(); return await _training.Group(id); });

    [HttpPost("groups")]
    public Task<IActionResult> SaveGroup([FromBody] GroupBT data) =>
        Run(async () => { AssertManager(); return await _training.SaveGroup(data); });

    [HttpDelete("groups/{id:long}")]
    public Task<IActionResult> DeleteGroup(long id) =>
        Run(async () => { AssertManager(); return await _training.DeleteGroup(id); });

    // ---- coaches ----------------------------------------------------------

    [HttpGet("coaches")]
    public Task<IActionResult> Coaches([FromQuery] bool includeInactive = false) =>
        Run(async () => { AssertStaff(); return await _training.Coaches(includeInactive); });

    [HttpPost("coaches")]
    public Task<IActionResult> SaveCoach([FromBody] CoachBT data) =>
        Run(async () => { AssertManager(); return await _training.SaveCoach(data); });

    [HttpDelete("coaches/{id:long}")]
    public Task<IActionResult> DeleteCoach(long id) =>
        Run(async () => { AssertManager(); return await _training.DeleteCoach(id); });

    // ---- enrollment -------------------------------------------------------

    [HttpGet("groups/{id:long}/students")]
    public Task<IActionResult> Roster(long id) =>
        Run(async () => { AssertStaff(); return await _training.Roster(id); });

    [HttpPost("groups/{id:long}/students")]
    public Task<IActionResult> Enroll(long id, [FromBody] EnrollBT data) =>
        Run(async () => { AssertStaff(); return await _training.Enroll(id, data); });

    [HttpDelete("groups/{id:long}/students/{studentId:long}")]
    public Task<IActionResult> Unenroll(long id, long studentId) =>
        Run(async () => { AssertStaff(); return await _training.Unenroll(id, studentId); });

    // ---- requests to join a course, sent from the public site ---------------

    [HttpGet("enrollment-requests")]
    public Task<IActionResult> EnrollmentRequests([FromQuery] short? status) =>
        Run(async () => { AssertStaff(); return await _training.EnrollmentRequests(status); });

    [HttpPost("enrollment-requests/{id:long}/approve")]
    public Task<IActionResult> ApproveEnrollmentRequest(long id) =>
        Run(async () => { AssertStaff(); return await _training.ApproveEnrollmentRequest(id); });

    [HttpPost("enrollment-requests/{id:long}/reject")]
    public Task<IActionResult> RejectEnrollmentRequest(long id, [FromBody] RejectRequestBT data) =>
        Run(async () => { AssertStaff(); return await _training.RejectEnrollmentRequest(id, data.note); });

    // ---- students ---------------------------------------------------------

    [HttpGet("students")]
    public Task<IActionResult> Students([FromQuery] long? groupid, [FromQuery] string? search,
        [FromQuery] bool unassigned = false) =>
        Run(async () => { AssertStaff(); return await _training.Students(groupid, search, unassigned); });

    [HttpGet("students/{id:long}")]
    public Task<IActionResult> Student(long id) =>
        Run(async () => { AssertStaff(); return await _training.Student(id); });

    [HttpPost("students")]
    public Task<IActionResult> SaveStudent([FromBody] StudentBT data) =>
        Run(async () => { AssertStaff(); return await _training.SaveStudent(data); });

    [HttpDelete("students/{id:long}")]
    public Task<IActionResult> DeleteStudent(long id) =>
        Run(async () => { AssertManager(); return await _training.DeleteStudent(id); });

    [HttpGet("students/{id:long}/attendance")]
    public Task<IActionResult> StudentAttendance(long id) =>
        Run(async () => { AssertStaff(); return await _schedule.StudentAttendance(id); });

    // ---- weekly timetable -------------------------------------------------

    [HttpGet("schedule")]
    public Task<IActionResult> Schedule([FromQuery] long? groupid) =>
        Run(async () => { AssertStaff(); return await _schedule.Schedule(groupid); });

    [HttpPost("schedule")]
    public Task<IActionResult> SaveSchedule([FromBody] ScheduleEntryBT data) =>
        Run(async () => { AssertManager(); return await _schedule.SaveScheduleEntry(data); });

    [HttpDelete("schedule/{id:long}")]
    public Task<IActionResult> DeleteSchedule(long id) =>
        Run(async () => { AssertManager(); return await _schedule.DeleteScheduleEntry(id); });

    // ---- dated classes ----------------------------------------------------

    [HttpGet("sessions")]
    public Task<IActionResult> Sessions([FromQuery] long? groupid, [FromQuery] DateTime? from,
        [FromQuery] DateTime? to, [FromQuery] short? status) =>
        Run(async () => { AssertStaff(); return await _schedule.Sessions(groupid, from, to, status); });

    [HttpGet("sessions/{id:long}")]
    public Task<IActionResult> Session(long id) =>
        Run(async () => { AssertStaff(); return await _schedule.Session(id); });

    [HttpPost("sessions")]
    public Task<IActionResult> SaveSession([FromBody] SessionBT data) =>
        Run(async () => { AssertStaff(); return await _schedule.SaveSession(data); });

    [HttpPost("sessions/generate")]
    public Task<IActionResult> GenerateSessions([FromBody] GenerateSessionsBT data) =>
        Run(async () => { AssertManager(); return await _schedule.GenerateSessions(data); });

    [HttpDelete("sessions/{id:long}")]
    public Task<IActionResult> DeleteSession(long id) =>
        Run(async () => { AssertManager(); return await _schedule.DeleteSession(id); });

    // ---- attendance -------------------------------------------------------

    [HttpGet("sessions/{id:long}/attendance")]
    public Task<IActionResult> Attendance(long id) =>
        Run(async () => { AssertStaff(); return await _schedule.Attendance(id); });

    [HttpPost("sessions/{id:long}/attendance")]
    public Task<IActionResult> SaveAttendance(long id, [FromBody] AttendanceSaveBT data) =>
        Run(async () => { AssertStaff(); return await _schedule.SaveAttendance(id, data, StaffId()); });

    // ---- fees and payments ------------------------------------------------

    [HttpGet("fees")]
    public Task<IActionResult> Fees([FromQuery] long? groupid, [FromQuery] long? studentid,
        [FromQuery] string? period, [FromQuery] short? status) =>
        Run(async () => { AssertStaff(); return await _billing.Fees(groupid, studentid, period, status); });

    [HttpPost("fees")]
    public Task<IActionResult> SaveFee([FromBody] FeeBT data) =>
        Run(async () => { AssertManager(); return await _billing.SaveFee(data); });

    [HttpPost("fees/generate")]
    public Task<IActionResult> GenerateFees([FromBody] GenerateFeesBT data) =>
        Run(async () => { AssertManager(); return await _billing.GenerateFees(data); });

    [HttpPost("fees/{id:long}/waive")]
    public Task<IActionResult> WaiveFee(long id, [FromBody] FeeBT? data) =>
        Run(async () => { AssertManager(); return await _billing.WaiveFee(id, data?.note); });

    [HttpDelete("fees/{id:long}")]
    public Task<IActionResult> DeleteFee(long id) =>
        Run(async () => { AssertManager(); return await _billing.DeleteFee(id); });

    [HttpPost("payments")]
    public Task<IActionResult> AddPayment([FromBody] PaymentBT data) =>
        Run(async () => { AssertStaff(); return await _billing.AddPayment(data, StaffId()); });

    [HttpGet("payments")]
    public Task<IActionResult> Payments([FromQuery] DateTime? from, [FromQuery] DateTime? to) =>
        Run(async () => { AssertStaff(); return await _billing.Payments(from, to); });

    [HttpDelete("payments/{id:long}")]
    public Task<IActionResult> DeletePayment(long id) =>
        Run(async () => { AssertManager(); return await _billing.DeletePayment(id); });

    // ---- venues -----------------------------------------------------------

    [HttpGet("venues")]
    public Task<IActionResult> Venues() =>
        Run(async () => { AssertStaff(); return await _training.Venues(); });

    [HttpPost("venues")]
    public Task<IActionResult> SaveVenue([FromBody] VenueBT data) =>
        Run(async () => { AssertManager(); return await _training.SaveVenue(data); });

    [HttpDelete("venues/{id:long}")]
    public Task<IActionResult> DeleteVenue(long id) =>
        Run(async () => { AssertManager(); return await _training.DeleteVenue(id); });

    // ---- announcements ----------------------------------------------------

    [HttpGet("announcements")]
    public Task<IActionResult> Announcements() =>
        Run(async () => { AssertStaff(); return await _training.Announcements(publishedOnly: false); });

    [HttpPost("announcements")]
    public Task<IActionResult> SaveAnnouncement([FromBody] AnnouncementBT data) =>
        Run(async () => { AssertStaff(); return await _training.SaveAnnouncement(data, StaffId()); });

    [HttpDelete("announcements/{id:long}")]
    public Task<IActionResult> DeleteAnnouncement(long id) =>
        Run(async () => { AssertManager(); return await _training.DeleteAnnouncement(id); });

    // ---- people -----------------------------------------------------------

    [HttpGet("staff")]
    public Task<IActionResult> Staff() =>
        Run(async () => { AssertStaff(); return await _training.StaffList(); });

    [HttpGet("members")]
    public Task<IActionResult> Members([FromQuery] string? status) =>
        Run(async () => { AssertManager(); return await _account.Members(TenantId(), status); });

    [HttpPost("members/{id:int}/approve")]
    public Task<IActionResult> ApproveMember(int id, [FromBody] MemberActionBT? data) =>
        Run(async () => { AssertManager(); return await _account.ApproveMember(TenantId(), id, data ?? new MemberActionBT()); });

    [HttpPost("members/{id:int}/role")]
    public Task<IActionResult> SetMemberRole(int id, [FromBody] MemberActionBT data) =>
        Run(async () => { AssertManager(); return await _account.SetMemberRole(TenantId(), id, data); });

    [HttpDelete("members/{id:int}")]
    public Task<IActionResult> RemoveMember(int id) =>
        Run(async () => { AssertManager(); return await _account.RemoveMember(TenantId(), id); });
}
