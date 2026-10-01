using volleyhub_api.DTO;
using volleyhub_api.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace volleyhub_api.Controllers;

// The coach's workspace. Every coach's rows share one schema; VolleyDbContext limits every query to
// the signed-in coach (accountid in the token), so nothing here filters by owner itself. Children
// and parents have no login at all.
[Authorize]
[ApiController]
[Route("api/vh/backoffice")]
public class BackofficeController : ApiControllerBase
{
    private readonly ILogger<BackofficeController> _logger;
    private readonly TrainingService _training;
    private readonly ScheduleService _schedule;
    private readonly BillingService _billing;
    private readonly ProgressService _progress;
    private readonly InvoiceService _invoices;
    private readonly PlanningService _planning;
    private readonly HealthService _health;
    private readonly ReportService _reports;
    private readonly ReportEmailService _reportEmail;

    protected override ILogger Logger => _logger;

    public BackofficeController(ILogger<BackofficeController> logger, TrainingService training,
        ScheduleService schedule, BillingService billing, ProgressService progress, InvoiceService invoices,
        PlanningService planning, HealthService health, ReportService reports,
        ReportEmailService reportEmail)
    {
        _logger = logger;
        _training = training;
        _schedule = schedule;
        _billing = billing;
        _progress = progress;
        _invoices = invoices;
        _planning = planning;
        _health = health;
        _reports = reports;
        _reportEmail = reportEmail;
    }

    private void AssertStaff()
    {
        if (AccountId() <= 0) throw new UnauthorizedAccessException("unauthorized");
    }

    // ---- home -------------------------------------------------------------

    // `date` is the coach's own calendar day (YYYY-MM-DD). The server runs in UTC, and before 8am in
    // Ulaanbaatar its "today" is still yesterday - so the client says which day it is.
    [HttpGet("dashboard")]
    public Task<IActionResult> Dashboard([FromQuery] DateTime? date) =>
        Run(async () =>
        {
            AssertStaff();

            var today = DateTime.SpecifyKind((date ?? DateTime.UtcNow).Date, DateTimeKind.Utc);
            var period = $"{today.Year:D4}-{today.Month:D2}";
            var week = await _schedule.Sessions(null, today, today.AddDays(7), null);
            var (expected, received, unpaid) = await _billing.MonthTotals(period);

            return new DashboardRT
            {
                groups = (await _training.Groups()).Count,
                students = (await _training.Students(null, null)).Count(s => s.status != 3),
                today = week.Where(s => s.session_date.Date == today).ToList(),
                upcoming = week.Where(s => s.session_date.Date > today && s.status != 3).Take(5).ToList(),
                period = period,
                month_expected = expected,
                month_received = received,
                month_unpaid = unpaid,
                absent_streaks = await _progress.AbsentStreaks(),
            };
        });

    // ---- groups -----------------------------------------------------------

    [HttpGet("groups")]
    public Task<IActionResult> Groups([FromQuery] bool includeInactive = false) =>
        Run(async () => { AssertStaff(); return await _training.Groups(includeInactive); });

    [HttpGet("groups/{id:long}")]
    public Task<IActionResult> Group(long id) =>
        Run(async () => { AssertStaff(); return await _training.Group(id); });

    [HttpPost("groups")]
    public Task<IActionResult> SaveGroup([FromBody] GroupBT data) =>
        Run(async () => { AssertStaff(); return await _training.SaveGroup(data); });

    [HttpDelete("groups/{id:long}")]
    public Task<IActionResult> DeleteGroup(long id) =>
        Run(async () => { AssertStaff(); return await _training.DeleteGroup(id); });

    [HttpGet("groups/{id:long}/students")]
    public Task<IActionResult> Roster(long id, [FromQuery] bool includeLeft = false) =>
        Run(async () => { AssertStaff(); return await _training.Roster(id, includeLeft); });

    // "Ирц бүртгэх" on a class: that day's session, created if the class has none yet.
    [HttpPost("groups/{id:long}/sessions/today")]
    public Task<IActionResult> TodaySession(long id, [FromBody] TodaySessionBT data) =>
        Run(async () => { AssertStaff(); return await _schedule.TodaySession(id, data.date); });

    [HttpPost("groups/{id:long}/students")]
    public Task<IActionResult> Enroll(long id, [FromBody] EnrollBT data) =>
        Run(async () => { AssertStaff(); return await _training.Enroll(id, data); });

    [HttpDelete("groups/{id:long}/students/{studentId:long}")]
    public Task<IActionResult> Unenroll(long id, long studentId) =>
        Run(async () => { AssertStaff(); return await _training.Unenroll(id, studentId); });

    // ---- children ---------------------------------------------------------

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
        Run(async () => { AssertStaff(); return await _training.DeleteStudent(id); });

    [HttpGet("students/{id:long}/attendance")]
    public Task<IActionResult> StudentAttendance(long id) =>
        Run(async () => { AssertStaff(); return await _schedule.StudentAttendance(id); });

    [HttpGet("students/{id:long}/notes")]
    public Task<IActionResult> Notes(long id) =>
        Run(async () => { AssertStaff(); return await _training.Notes(id); });

    [HttpPost("students/{id:long}/notes")]
    public Task<IActionResult> AddNote(long id, [FromBody] NoteBT data) =>
        Run(async () => { AssertStaff(); return await _training.AddNote(id, data, StaffId()); });

    // The child's report as an email to the guardian / child. preview=true only builds it.
    [HttpPost("students/{id:long}/report/email")]
    public Task<IActionResult> EmailReport(long id, [FromBody] ReportEmailBT data) =>
        Run(async () => { AssertStaff(); return await _reportEmail.Send(AccountId(), id, data ?? new ReportEmailBT(), StaffId()); });

    [HttpDelete("students/{id:long}/notes/{noteId:long}")]
    public Task<IActionResult> DeleteNote(long id, long noteId) =>
        Run(async () => { AssertStaff(); return await _training.DeleteNote(id, noteId); });

    // The coach's own rating criteria.
    [HttpGet("skills")]
    public Task<IActionResult> Skills() =>
        Run(async () => { AssertStaff(); return await _progress.Skills(); });

    [HttpPost("skills")]
    public Task<IActionResult> SaveSkill([FromBody] SkillBT data) =>
        Run(async () => { AssertStaff(); return await _progress.SaveSkill(data); });

    [HttpPost("skills/order")]
    public Task<IActionResult> OrderSkills([FromBody] SkillOrderBT data) =>
        Run(async () => { AssertStaff(); return await _progress.OrderSkills(data); });

    [HttpDelete("skills/{id:int}")]
    public Task<IActionResult> DeleteSkill(int id) =>
        Run(async () => { AssertStaff(); return await _progress.DeleteSkill(id); });

    [HttpGet("students/{id:long}/ratings")]
    public Task<IActionResult> Ratings(long id) =>
        Run(async () => { AssertStaff(); return await _progress.Ratings(id); });

    [HttpPost("students/{id:long}/ratings")]
    public Task<IActionResult> SaveRatings(long id, [FromBody] RatingSaveBT data) =>
        Run(async () => { AssertStaff(); return await _progress.SaveRatings(id, data, StaffId()); });

    // ---- weekly timetable -------------------------------------------------

    [HttpGet("schedule")]
    public Task<IActionResult> Schedule([FromQuery] long? groupid) =>
        Run(async () => { AssertStaff(); return await _schedule.Schedule(groupid); });

    [HttpPost("schedule")]
    public Task<IActionResult> SaveSchedule([FromBody] ScheduleEntryBT data) =>
        Run(async () => { AssertStaff(); return await _schedule.SaveScheduleEntry(data); });

    [HttpDelete("schedule/{id:long}")]
    public Task<IActionResult> DeleteSchedule(long id) =>
        Run(async () => { AssertStaff(); return await _schedule.DeleteScheduleEntry(id); });

    // ---- dated classes and the register -----------------------------------

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

    [HttpPost("sessions/{id:long}/cancel")]
    public Task<IActionResult> CancelSession(long id, [FromBody] CancelSessionBT? data) =>
        Run(async () => { AssertStaff(); return await _schedule.CancelSession(id, data?.reason); });

    [HttpPost("sessions/{id:long}/restore")]
    public Task<IActionResult> RestoreSession(long id) =>
        Run(async () => { AssertStaff(); return await _schedule.RestoreSession(id); });

    [HttpPost("sessions/cancel-range")]
    public Task<IActionResult> CancelRange([FromBody] CancelRangeBT data) =>
        Run(async () => { AssertStaff(); return await _schedule.CancelRange(data); });

    [HttpPost("sessions/{id:long}/makeup")]
    public Task<IActionResult> Makeup(long id, [FromBody] MakeupBT data) =>
        Run(async () => { AssertStaff(); return await _schedule.Makeup(id, data); });

    [HttpPost("sessions/generate")]
    public Task<IActionResult> GenerateSessions([FromBody] GenerateSessionsBT data) =>
        Run(async () => { AssertStaff(); return await _schedule.GenerateSessions(data); });

    [HttpDelete("sessions/{id:long}")]
    public Task<IActionResult> DeleteSession(long id) =>
        Run(async () => { AssertStaff(); return await _schedule.DeleteSession(id); });

    [HttpGet("sessions/{id:long}/attendance")]
    public Task<IActionResult> Attendance(long id) =>
        Run(async () => { AssertStaff(); return await _schedule.Attendance(id); });

    [HttpPost("sessions/{id:long}/attendance")]
    public Task<IActionResult> SaveAttendance(long id, [FromBody] AttendanceSaveBT data) =>
        Run(async () => { AssertStaff(); return await _schedule.SaveAttendance(id, data, StaffId()); });

    // ---- fees: the coach's record of what arrived in their bank account ----

    [HttpGet("month")]
    public Task<IActionResult> Month([FromQuery] string period, [FromQuery] long? groupid) =>
        Run(async () => { AssertStaff(); return await _billing.Month(period, groupid); });

    [HttpGet("fees")]
    public Task<IActionResult> Fees([FromQuery] long? groupid, [FromQuery] long? studentid,
        [FromQuery] string? period, [FromQuery] short? status) =>
        Run(async () => { AssertStaff(); return await _billing.Fees(groupid, studentid, period, status); });

    [HttpPost("fees")]
    public Task<IActionResult> SaveFee([FromBody] FeeBT data) =>
        Run(async () => { AssertStaff(); return await _billing.SaveFee(data); });

    [HttpPost("fees/generate")]
    public Task<IActionResult> GenerateFees([FromBody] GenerateFeesBT data) =>
        Run(async () => { AssertStaff(); return await _billing.GenerateFees(data); });

    // Invoice texts to parents for the month's unpaid fees (or the ones picked). preview=true
    // returns the texts without sending.
    [HttpPost("fees/notify")]
    public Task<IActionResult> Notify([FromBody] NotifyBT data) =>
        Run(async () => { AssertStaff(); return await _invoices.Notify(AccountId(), data, StaffId()); });

    [HttpPost("fees/{id:long}/notified")]
    public Task<IActionResult> RecordManualNotice(long id, [FromBody] ManualNoticeBT data) =>
        Run(async () => { AssertStaff(); return await _invoices.RecordManual(id, data, StaffId()); });

    [HttpPost("fees/{id:long}/paid")]
    public Task<IActionResult> MarkPaid(long id, [FromBody] MarkPaidBT? data) =>
        Run(async () => { AssertStaff(); return await _billing.MarkPaid(id, data ?? new MarkPaidBT(), StaffId()); });

    [HttpPost("fees/{id:long}/waive")]
    public Task<IActionResult> WaiveFee(long id, [FromBody] FeeBT? data) =>
        Run(async () => { AssertStaff(); return await _billing.WaiveFee(id, data?.note); });

    [HttpDelete("fees/{id:long}")]
    public Task<IActionResult> DeleteFee(long id) =>
        Run(async () => { AssertStaff(); return await _billing.DeleteFee(id); });

    [HttpPost("payments")]
    public Task<IActionResult> AddPayment([FromBody] PaymentBT data) =>
        Run(async () => { AssertStaff(); return await _billing.AddPayment(data, StaffId()); });

    [HttpGet("payments")]
    public Task<IActionResult> Payments([FromQuery] DateTime? from, [FromQuery] DateTime? to) =>
        Run(async () => { AssertStaff(); return await _billing.Payments(from, to); });

    // Undo: the fee follows, so it goes back to unpaid.
    [HttpDelete("payments/{id:long}")]
    public Task<IActionResult> DeletePayment(long id) =>
        Run(async () => { AssertStaff(); return await _billing.DeletePayment(id); });

    // ---- workspace settings: training name, bank account for invoices ----

    [HttpGet("settings")]
    public Task<IActionResult> Settings() =>
        Run(async () => { AssertStaff(); return await _invoices.Settings(AccountId()); });

    [HttpPut("settings")]
    public Task<IActionResult> SaveSettings([FromBody] SettingsBT data) =>
        Run(async () => { AssertStaff(); return await _invoices.SaveSettings(AccountId(), data); });

    // ---- drill library and lesson plans --------------------------------------

    [HttpGet("drills")]
    public Task<IActionResult> Drills() =>
        Run(async () => { AssertStaff(); return await _planning.Drills(); });

    [HttpPost("drills")]
    public Task<IActionResult> SaveDrill([FromBody] DrillBT data) =>
        Run(async () => { AssertStaff(); return await _planning.SaveDrill(data); });

    [HttpDelete("drills/{id:long}")]
    public Task<IActionResult> DeleteDrill(long id) =>
        Run(async () => { AssertStaff(); return await _planning.DeleteDrill(id); });

    [HttpGet("plans")]
    public Task<IActionResult> Plans() =>
        Run(async () => { AssertStaff(); return await _planning.Plans(); });

    [HttpGet("plans/{id:long}")]
    public Task<IActionResult> Plan(long id) =>
        Run(async () => { AssertStaff(); return await _planning.Plan(id); });

    [HttpPost("plans")]
    public Task<IActionResult> SavePlan([FromBody] PlanBT data) =>
        Run(async () => { AssertStaff(); return await _planning.SavePlan(data); });

    [HttpDelete("plans/{id:long}")]
    public Task<IActionResult> DeletePlan(long id) =>
        Run(async () => { AssertStaff(); return await _planning.DeletePlan(id); });

    // A starter library: ~17 children's drills and 4 hour-long plans. Skips anything already there.
    [HttpPost("plans/samples")]
    public Task<IActionResult> AddPlanSamples() =>
        Run(async () => { AssertStaff(); return await _planning.AddSamples(await _progress.Skills()); });

    [HttpPost("sessions/{id:long}/plan")]
    public Task<IActionResult> SetSessionPlan(long id, [FromBody] SessionPlanBT data) =>
        Run(async () => { AssertStaff(); return await _planning.SetSessionPlan(id, data.planid); });

    // ---- discount types ------------------------------------------------------

    [HttpGet("discounts")]
    public Task<IActionResult> Discounts() =>
        Run(async () => { AssertStaff(); return await _billing.Discounts(); });

    [HttpPost("discounts")]
    public Task<IActionResult> SaveDiscount([FromBody] DiscountBT data) =>
        Run(async () => { AssertStaff(); return await _billing.SaveDiscount(data); });

    [HttpDelete("discounts/{id:long}")]
    public Task<IActionResult> DeleteDiscount(long id) =>
        Run(async () => { AssertStaff(); return await _billing.DeleteDiscount(id); });

    // ---- physical development and health ---------------------------------------

    [HttpGet("measure-types")]
    public Task<IActionResult> MeasureTypes() =>
        Run(async () => { AssertStaff(); return await _health.Types(); });

    [HttpPost("measure-types")]
    public Task<IActionResult> SaveMeasureType([FromBody] MeasureTypeBT data) =>
        Run(async () => { AssertStaff(); return await _health.SaveType(data); });

    [HttpDelete("measure-types/{id:long}")]
    public Task<IActionResult> DeleteMeasureType(long id) =>
        Run(async () => { AssertStaff(); return await _health.DeleteType(id); });

    [HttpGet("students/{id:long}/measurements")]
    public Task<IActionResult> Measurements(long id) =>
        Run(async () => { AssertStaff(); return await _health.Measurements(id); });

    [HttpPost("students/{id:long}/measurements")]
    public Task<IActionResult> SaveMeasurements(long id, [FromBody] MeasureSaveBT data) =>
        Run(async () => { AssertStaff(); return await _health.SaveMeasurements(id, data); });

    [HttpDelete("students/{id:long}/measurements/{measureId:long}")]
    public Task<IActionResult> DeleteMeasurement(long id, long measureId) =>
        Run(async () => { AssertStaff(); return await _health.DeleteMeasurement(id, measureId); });

    [HttpGet("students/{id:long}/injuries")]
    public Task<IActionResult> Injuries(long id) =>
        Run(async () => { AssertStaff(); return await _health.Injuries(id); });

    [HttpPost("students/{id:long}/injuries")]
    public Task<IActionResult> SaveInjury(long id, [FromBody] InjuryBT data) =>
        Run(async () => { AssertStaff(); return await _health.SaveInjury(id, data, StaffId()); });

    [HttpDelete("students/{id:long}/injuries/{injuryId:long}")]
    public Task<IActionResult> DeleteInjury(long id, long injuryId) =>
        Run(async () => { AssertStaff(); return await _health.DeleteInjury(id, injuryId); });

    // Allergy / open-injury flags for every child, for lists that show a warning icon.
    [HttpGet("health-flags")]
    public Task<IActionResult> HealthFlags() =>
        Run(async () => { AssertStaff(); return (await _health.Flags()).Values.ToList(); });

    // ---- reports ---------------------------------------------------------------

    [HttpGet("reports/income")]
    public Task<IActionResult> IncomeReport([FromQuery] int year) =>
        Run(async () => { AssertStaff(); return await _reports.Income(year); });

    // ---- halls ------------------------------------------------------------

    [HttpGet("venues")]
    public Task<IActionResult> Venues() =>
        Run(async () => { AssertStaff(); return await _training.Venues(); });

    [HttpPost("venues")]
    public Task<IActionResult> SaveVenue([FromBody] VenueBT data) =>
        Run(async () => { AssertStaff(); return await _training.SaveVenue(data); });

    [HttpDelete("venues/{id:long}")]
    public Task<IActionResult> DeleteVenue(long id) =>
        Run(async () => { AssertStaff(); return await _training.DeleteVenue(id); });
}
