namespace volleyhub_api.DTO;

// ---- groups ---------------------------------------------------------------

public class GroupBT
{
    public long groupid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? level { get; set; }
    public string? agegroup { get; set; }
    public short gender { get; set; } = 3;
    public long? venueid { get; set; }
    public int capacity { get; set; }
    public decimal fee_amount { get; set; }
    public string? notes { get; set; }
    public bool isactive { get; set; } = true;
}

public class GroupRT
{
    public long groupid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? level { get; set; }
    public string? agegroup { get; set; }
    public short gender { get; set; }
    public long? venueid { get; set; }
    public string? venuename { get; set; }
    public int capacity { get; set; }
    public decimal fee_amount { get; set; }
    public string? notes { get; set; }
    public bool isactive { get; set; }
    public int studentcount { get; set; }
    public List<ScheduleEntryRT> schedule { get; set; } = new();
}

// ---- students -------------------------------------------------------------

public class StudentBT
{
    public long studentid { get; set; }
    public string last_name { get; set; } = string.Empty;
    public string first_name { get; set; } = string.Empty;
    public DateTime? date_of_birth { get; set; }
    public int? birth_year { get; set; }
    public short? gender { get; set; }
    public string? phone { get; set; }
    public string? emergency_name { get; set; }
    public string? emergency_relation { get; set; }
    public string? emergency_phone { get; set; }
    public int? height_cm { get; set; }
    public string? photo { get; set; }
    // 1=Active, 3=Left. Left requires left_date.
    public short status { get; set; } = 1;
    public DateTime? start_date { get; set; }
    public DateTime? left_date { get; set; }
    public string? notes { get; set; }
    public string? pay_ref { get; set; }
    public long? discountid { get; set; }
    public string? allergies { get; set; }
    public string? medical_notes { get; set; }
    public string? blood_type { get; set; }
    // The class this form is filled in from. The child is enrolled there (or kept there) at
    // fee_amount; null fee_amount takes the class price.
    public long? groupid { get; set; }
    public decimal? fee_amount { get; set; }
}

public class StudentRT
{
    public long studentid { get; set; }
    public int accountid { get; set; }
    public string last_name { get; set; } = string.Empty;
    public string first_name { get; set; } = string.Empty;
    public DateTime? date_of_birth { get; set; }
    public short? gender { get; set; }
    public string? phone { get; set; }
    public string? emergency_name { get; set; }
    public string? emergency_relation { get; set; }
    public string? emergency_phone { get; set; }
    public int? height_cm { get; set; }
    public string? photo { get; set; }
    public short status { get; set; }
    public int? birth_year { get; set; }
    public DateTime? start_date { get; set; }
    public DateTime? left_date { get; set; }
    public string? notes { get; set; }
    public string? pay_ref { get; set; }
    public long? discountid { get; set; }
    public string? discountname { get; set; }
    public string? allergies { get; set; }
    public string? medical_notes { get; set; }
    public string? blood_type { get; set; }
    // Current group, when the student is in one.
    public long? groupid { get; set; }
    public string? groupname { get; set; }
    public decimal? fee_amount { get; set; }
    // Outstanding balance across every unpaid fee, so the list can flag who owes money.
    public decimal balance { get; set; }
}

public class EnrollBT
{
    public long studentid { get; set; }
    // Null takes the group's standard price.
    public decimal? fee_amount { get; set; }
}

public class EnrollmentRT
{
    public long enrollmentid { get; set; }
    public long studentid { get; set; }
    public string last_name { get; set; } = string.Empty;
    public string first_name { get; set; } = string.Empty;
    public short? gender { get; set; }
    public int? birth_year { get; set; }
    public string? phone { get; set; }
    public string? emergency_name { get; set; }
    public string? emergency_relation { get; set; }
    public string? emergency_phone { get; set; }
    public DateTime? date_of_birth { get; set; }
    // The child's status (1=Active, 3=Left), not the enrollment's.
    public short status { get; set; }
    public decimal fee_amount { get; set; }
    public DateTime joined { get; set; }
    public DateTime? left_at { get; set; }
    public bool active { get; set; }
    public decimal balance { get; set; }
}

// ---- schedule -------------------------------------------------------------

public class ScheduleEntryBT
{
    public long scheduleid { get; set; }
    public long groupid { get; set; }
    public long? venueid { get; set; }
    public short weekday { get; set; }
    public int start_minute { get; set; }
    public int end_minute { get; set; }
    public bool isactive { get; set; } = true;
}

public class ScheduleEntryRT
{
    public long scheduleid { get; set; }
    public long groupid { get; set; }
    public string? groupname { get; set; }
    public long? venueid { get; set; }
    public string? venuename { get; set; }
    public short weekday { get; set; }
    public int start_minute { get; set; }
    public int end_minute { get; set; }
    public bool isactive { get; set; }
}

// Generates dated classes from a group's weekly timetable. Existing classes in the range are left
// alone, so running it twice never duplicates or overwrites attendance already taken.
public class GenerateSessionsBT
{
    public long? groupid { get; set; }
    public DateTime from { get; set; }
    public DateTime to { get; set; }
}

// ---- sessions and attendance ---------------------------------------------

public class SessionBT
{
    public long sessionid { get; set; }
    public long groupid { get; set; }
    public long? venueid { get; set; }
    public int? coach_staffid { get; set; }
    public DateTime session_date { get; set; }
    public int start_minute { get; set; }
    public int end_minute { get; set; }
    public short status { get; set; } = 1;
    public string? notes { get; set; }
}

public class SessionRT
{
    public long sessionid { get; set; }
    public long groupid { get; set; }
    public string groupname { get; set; } = string.Empty;
    public long? venueid { get; set; }
    public string? venuename { get; set; }
    public int? coach_staffid { get; set; }
    public string? coachname { get; set; }
    public DateTime session_date { get; set; }
    public int start_minute { get; set; }
    public int end_minute { get; set; }
    public short status { get; set; }
    public bool attendance_taken { get; set; }
    public string? notes { get; set; }
    public long? planid { get; set; }
    public string? planname { get; set; }
    public int present_count { get; set; }
    public int student_count { get; set; }
}

public class AttendanceMarkBT
{
    public long studentid { get; set; }
    public short status { get; set; } = 1;
    public string? note { get; set; }
}

// Saving attendance replaces every record of the class in one go, so a correction is just a re-post.
public class AttendanceSaveBT
{
    public List<AttendanceMarkBT> records { get; set; } = new();
}

public class AttendanceRT
{
    public long studentid { get; set; }
    public string? allergies { get; set; }
    public string? injury { get; set; }
    public string last_name { get; set; } = string.Empty;
    public string first_name { get; set; } = string.Empty;
    public short status { get; set; }
    public string? note { get; set; }
}

// One student's attendance history, as the mobile app shows it.
public class AttendanceSummaryRT
{
    public int total { get; set; }
    public int present { get; set; }
    public int absent { get; set; }
    public int excused { get; set; }
    public int late { get; set; }
    public double rate { get; set; }
    public List<AttendanceHistoryRT> history { get; set; } = new();
}

public class AttendanceHistoryRT
{
    public long sessionid { get; set; }
    public DateTime session_date { get; set; }
    public string groupname { get; set; } = string.Empty;
    public short status { get; set; }
    public string? note { get; set; }
}

// ---- fees and payments ----------------------------------------------------

public class FeeBT
{
    public long feeid { get; set; }
    public long studentid { get; set; }
    public long groupid { get; set; }
    public string period { get; set; } = string.Empty;
    public decimal amount { get; set; }
    public DateTime? due_date { get; set; }
    public string? note { get; set; }
}

// Bills every active student of a group (or of every group) for one month. Skips students who
// already have a fee for that period, so it is safe to re-run.
public class GenerateFeesBT
{
    public long? groupid { get; set; }
    public string period { get; set; } = string.Empty;
    public DateTime? due_date { get; set; }
}

public class FeeRT
{
    public long feeid { get; set; }
    public long studentid { get; set; }
    public string last_name { get; set; } = string.Empty;
    public string first_name { get; set; } = string.Empty;
    public long groupid { get; set; }
    public string groupname { get; set; } = string.Empty;
    public string period { get; set; } = string.Empty;
    public decimal amount { get; set; }
    public decimal paid_amount { get; set; }
    public decimal balance { get; set; }
    public DateTime? due_date { get; set; }
    public short status { get; set; }
    public string? note { get; set; }
    public string? pay_ref { get; set; }
    public decimal? base_amount { get; set; }
    public string? discount_name { get; set; }
    public string? phone { get; set; }
    // When the last invoice text for this fee went out, if one has.
    public DateTime? notified_at { get; set; }
    public List<PaymentRT> payments { get; set; } = new();
}

// One month at a glance: every fee of the period, the totals the coach checks against the bank
// statement, and how many enrolled children have no fee yet (so the page can offer to create them).
public class MonthRT
{
    public string period { get; set; } = string.Empty;
    public decimal expected { get; set; }
    public decimal received { get; set; }
    public int paid_count { get; set; }
    public int fee_count { get; set; }
    public int missing_count { get; set; }
    public List<FeeRT> fees { get; set; } = new();
}

public class PaymentBT
{
    public long feeid { get; set; }
    public decimal amount { get; set; }
    public short method { get; set; } = 2;
    public DateTime? paid_at { get; set; }
    public string? payer { get; set; }
    public string? note { get; set; }
}

// "I saw it in my statement": settle whatever is left on the fee in one tap. amount is optional -
// null pays the remaining balance, a smaller number records a part payment.
public class MarkPaidBT
{
    public decimal? amount { get; set; }
    public short method { get; set; } = 2;
    public DateTime? paid_at { get; set; }
    public string? payer { get; set; }
    public string? note { get; set; }
}

public class PaymentRT
{
    public long paymentid { get; set; }
    public long feeid { get; set; }
    public long studentid { get; set; }
    public decimal amount { get; set; }
    public short method { get; set; }
    public DateTime paid_at { get; set; }
    public string? payer { get; set; }
    public string? note { get; set; }
    // Filled on the payments list, so it reads without a second lookup.
    public string? studentname { get; set; }
    public string? period { get; set; }
}

// ---- venues ---------------------------------------------------------------

public class VenueBT
{
    public long venueid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? address { get; set; }
    public int courts { get; set; } = 1;
    public string? contactphone { get; set; }
    public string? notes { get; set; }
}

// ---- dashboard ------------------------------------------------------------

// The home screen: today's classes first, then this month's money.
public class DashboardRT
{
    public int groups { get; set; }
    public int students { get; set; }
    public List<SessionRT> today { get; set; } = new();
    public List<SessionRT> upcoming { get; set; } = new();
    public string period { get; set; } = string.Empty;
    public decimal month_expected { get; set; }
    public decimal month_received { get; set; }
    public int month_unpaid { get; set; }
    // Children who missed their last few classes in a row - worth a call to the parent.
    public List<AbsentStreakRT> absent_streaks { get; set; } = new();
}

public class AbsentStreakRT
{
    public long studentid { get; set; }
    public string last_name { get; set; } = string.Empty;
    public string first_name { get; set; } = string.Empty;
    public string? groupname { get; set; }
    public int missed { get; set; }
}

// ---- progress -------------------------------------------------------------

public class SkillScoreBT
{
    public short skill { get; set; }
    public short score { get; set; }
}

public class RatingSaveBT
{
    public string period { get; set; } = string.Empty;
    public List<SkillScoreBT> scores { get; set; } = new();
    public string? note { get; set; }
}

public class RatingMonthRT
{
    public string period { get; set; } = string.Empty;
    // skill -> score, only the skills that were rated.
    public Dictionary<short, short> scores { get; set; } = new();
    public string? note { get; set; }
}

// ---- rating criteria --------------------------------------------------------

public class SkillBT
{
    public short skillid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? hint { get; set; }
    public int sort_order { get; set; }
}

public class SkillRT
{
    public short skillid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? hint { get; set; }
    public int sort_order { get; set; }
}

public class SkillOrderBT
{
    public List<short> skillids { get; set; } = new();
}

// ---- notes ----------------------------------------------------------------

public class NoteBT
{
    public string body { get; set; } = string.Empty;
}

public class NoteRT
{
    public long noteid { get; set; }
    public string body { get; set; } = string.Empty;
    public string? author { get; set; }
    public DateTime created { get; set; }
}

// ---- taking the register from a class ---------------------------------------

// The coach's own calendar day; the class's session for it is found or created.
public class TodaySessionBT
{
    public DateTime date { get; set; }
}

// ---- invoices -------------------------------------------------------------

public class NotifyBT
{
    public string period { get; set; } = string.Empty;
    public long? groupid { get; set; }
    // Only these fees; empty means every unpaid fee of the period (and class).
    public List<long>? feeids { get; set; }
    // true: build the texts and return them without sending anything.
    public bool preview { get; set; }
}

public class NotifyItemRT
{
    public long feeid { get; set; }
    public long studentid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? phone { get; set; }
    public string message { get; set; } = string.Empty;
    // sent | failed | logged | no_phone | preview
    public string status { get; set; } = string.Empty;
    public string? error { get; set; }
}

public class NotifyRT
{
    public int sent { get; set; }
    public int failed { get; set; }
    public int skipped { get; set; }
    // False when no SMS gateway is configured: texts are recorded but not delivered.
    public bool gateway { get; set; }
    public List<NotifyItemRT> items { get; set; } = new();
}

// ---- workspace settings -----------------------------------------------------

public class SettingsBT
{
    public string tenantname { get; set; } = string.Empty;
    public string? contactphone { get; set; }
    public string? bank_name { get; set; }
    public string? bank_account { get; set; }
    public string? bank_holder { get; set; }
}

public class SettingsRT : SettingsBT
{
    public bool sms_enabled { get; set; }
}

// ---- drill library and lesson plans -------------------------------------------

public class DrillBT
{
    public long drillid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? description { get; set; }
    public int minutes { get; set; }
    public string? level { get; set; }
    public string? equipment { get; set; }
    public List<short> skillids { get; set; } = new();
}

public class DrillRT
{
    public long drillid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? description { get; set; }
    public int minutes { get; set; }
    public string? level { get; set; }
    public string? equipment { get; set; }
    public List<short> skillids { get; set; } = new();
    // How many plans use it, so deleting can warn.
    public int plan_count { get; set; }
}

public class PlanItemBT
{
    public long? drillid { get; set; }
    public string title { get; set; } = string.Empty;
    public int minutes { get; set; }
}

public class PlanBT
{
    public long planid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? notes { get; set; }
    public List<PlanItemBT> items { get; set; } = new();
}

public class PlanItemRT
{
    public long itemid { get; set; }
    public long? drillid { get; set; }
    public string title { get; set; } = string.Empty;
    public int minutes { get; set; }
    public string? description { get; set; }
    public List<short> skillids { get; set; } = new();
}

public class PlanRT
{
    public long planid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? notes { get; set; }
    public int total_minutes { get; set; }
    public List<PlanItemRT> items { get; set; } = new();
}

public class SessionPlanBT
{
    public long? planid { get; set; }
}

// ---- discounts --------------------------------------------------------------

public class DiscountBT
{
    public long discountid { get; set; }
    public string name { get; set; } = string.Empty;
    // 1=Percent, 2=Fixed ₮
    public short kind { get; set; } = 1;
    public decimal value { get; set; }
}

public class DiscountRT : DiscountBT
{
    public int student_count { get; set; }
}

// ---- physical development and health ------------------------------------------

public class MeasureTypeBT
{
    public long typeid { get; set; }
    public string name { get; set; } = string.Empty;
    public string unit { get; set; } = string.Empty;
    public bool higher_is_better { get; set; } = true;
}

public class MeasureTypeRT : MeasureTypeBT
{
    public int sort_order { get; set; }
}

public class MeasureValueBT
{
    public long typeid { get; set; }
    public decimal value { get; set; }
}

// One sitting: several measurements taken the same day.
public class MeasureSaveBT
{
    public DateTime measured_on { get; set; }
    public List<MeasureValueBT> values { get; set; } = new();
    public string? note { get; set; }
}

public class MeasurementRT
{
    public long measureid { get; set; }
    public long typeid { get; set; }
    public decimal value { get; set; }
    public DateTime measured_on { get; set; }
    public string? note { get; set; }
}

public class InjuryBT
{
    public long injuryid { get; set; }
    public DateTime occurred_on { get; set; }
    public string? body_part { get; set; }
    public string description { get; set; } = string.Empty;
    public short status { get; set; } = 1;
    public DateTime? recovered_on { get; set; }
}

public class InjuryRT : InjuryBT
{
    public DateTime created { get; set; }
}

// Health flags shown next to a name on the register and class list.
public class HealthFlagRT
{
    public long studentid { get; set; }
    public string? allergies { get; set; }
    public bool injured { get; set; }
    public string? injury { get; set; }
}

// ---- income report ----------------------------------------------------------

public class ReportMonthRT
{
    public string period { get; set; } = string.Empty;
    // Billed for this month (after discounts), and how much of that has been paid so far.
    public decimal billed { get; set; }
    public decimal paid { get; set; }
    public decimal discounts { get; set; }
    // Money actually received during this calendar month, whatever month it was for.
    public decimal collected { get; set; }
    public int children { get; set; }
}

public class ReportGroupRT
{
    public long groupid { get; set; }
    public string name { get; set; } = string.Empty;
    public decimal billed { get; set; }
    public decimal paid { get; set; }
}

public class ReportDebtorRT
{
    public long studentid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? groupname { get; set; }
    public decimal owed { get; set; }
    public int months { get; set; }
}

public class IncomeReportRT
{
    public int year { get; set; }
    public decimal billed { get; set; }
    public decimal paid { get; set; }
    public decimal collected { get; set; }
    public decimal discounts { get; set; }
    public decimal outstanding { get; set; }
    public List<ReportMonthRT> months { get; set; } = new();
    public List<ReportGroupRT> groups { get; set; } = new();
    // method -> amount collected this year
    public Dictionary<short, decimal> methods { get; set; } = new();
    public List<ReportDebtorRT> debtors { get; set; } = new();
}
