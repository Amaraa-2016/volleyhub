namespace volleyhub_api.DTO;

// ---- groups ---------------------------------------------------------------

// ---- coaches --------------------------------------------------------------

public class CoachBT
{
    public long coachid { get; set; }
    public string last_name { get; set; } = string.Empty;
    public string first_name { get; set; } = string.Empty;
    public string? photo { get; set; }
    public string? position { get; set; }
    public string? rank { get; set; }
    public string? bio { get; set; }
    public string? phone { get; set; }
    public bool isactive { get; set; } = true;
    public int sort_order { get; set; }
}

public class CoachRT
{
    public long coachid { get; set; }
    public string last_name { get; set; } = string.Empty;
    public string first_name { get; set; } = string.Empty;
    public string? photo { get; set; }
    public string? position { get; set; }
    public string? rank { get; set; }
    public string? bio { get; set; }
    public string? phone { get; set; }
    public bool isactive { get; set; }
    public int sort_order { get; set; }
    // How many courses this coach is on, so the list can warn before a delete.
    public int coursecount { get; set; }
}

// ---- courses --------------------------------------------------------------

public class GroupBT
{
    public long groupid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? level { get; set; }
    public string? agegroup { get; set; }
    public short gender { get; set; } = 3;
    // A course can be taught by several coaches; an empty list simply means none assigned yet.
    public List<long> coachids { get; set; } = new();
    public long? venueid { get; set; }
    public int capacity { get; set; }
    public decimal fee_amount { get; set; }
    public string? notes { get; set; }
    public bool isactive { get; set; } = true;
    // Public listing.
    public string? cover { get; set; }
    public DateTime? start_date { get; set; }
    public string? address { get; set; }
    public string? map_url { get; set; }
    public string? phone { get; set; }
    // Optional override. Left null the coordinates are read from map_url instead.
    public double? latitude { get; set; }
    public double? longitude { get; set; }
}

public class GroupRT
{
    public long groupid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? level { get; set; }
    public string? agegroup { get; set; }
    public short gender { get; set; }
    public List<CoachRT> coaches { get; set; } = new();
    public long? venueid { get; set; }
    public string? venuename { get; set; }
    public int capacity { get; set; }
    public decimal fee_amount { get; set; }
    public string? notes { get; set; }
    public bool isactive { get; set; }
    public string? cover { get; set; }
    public DateTime? start_date { get; set; }
    public string? address { get; set; }
    public string? map_url { get; set; }
    public string? phone { get; set; }
    public double? latitude { get; set; }
    public double? longitude { get; set; }
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
    public short? gender { get; set; }
    public string? phone { get; set; }
    public string? emergency_name { get; set; }
    public string? emergency_relation { get; set; }
    public string? emergency_phone { get; set; }
    public int? height_cm { get; set; }
    public string? photo { get; set; }
    public short status { get; set; } = 1;
    public string? notes { get; set; }
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
    public string? notes { get; set; }
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
    public string? phone { get; set; }
    public string? emergency_phone { get; set; }
    public DateTime? date_of_birth { get; set; }
    public short status { get; set; }
    public decimal fee_amount { get; set; }
    public DateTime joined { get; set; }
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
    public List<PaymentRT> payments { get; set; } = new();
}

public class PaymentBT
{
    public long feeid { get; set; }
    public decimal amount { get; set; }
    public short method { get; set; } = 1;
    public DateTime? paid_at { get; set; }
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
    public string? note { get; set; }
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

// ---- announcements --------------------------------------------------------

public class AnnouncementBT
{
    public long announcementid { get; set; }
    public string title { get; set; } = string.Empty;
    public string? body { get; set; }
    public string? cover { get; set; }
    public bool publish { get; set; }
}

public class AnnouncementRT
{
    public long announcementid { get; set; }
    public string title { get; set; } = string.Empty;
    public string? body { get; set; }
    public string? cover { get; set; }
    public string? authorname { get; set; }
    public DateTime? published_at { get; set; }
    public DateTime created { get; set; }
}

// ---- dashboard ------------------------------------------------------------

public class DashboardRT
{
    public int groups { get; set; }
    public int students { get; set; }
    public int sessions_this_week { get; set; }
    public int pending_members { get; set; }
    public decimal unpaid_total { get; set; }
    public int unpaid_students { get; set; }
    public List<SessionRT> next_sessions { get; set; } = new();
}

// A request from the public site to join one course, as the centre's console sees it.
public class EnrollmentRequestRT
{
    public long requestid { get; set; }
    public long groupid { get; set; }
    public string groupname { get; set; } = string.Empty;
    public int accountid { get; set; }
    public string last_name { get; set; } = string.Empty;
    public string first_name { get; set; } = string.Empty;
    public string? phone { get; set; }
    public string? note { get; set; }
    // 1=Pending, 2=Approved, 3=Rejected
    public short status { get; set; }
    public string? decision_note { get; set; }
    public long? studentid { get; set; }
    public DateTime created { get; set; }
}

public class RejectRequestBT
{
    public string? note { get; set; }
}
