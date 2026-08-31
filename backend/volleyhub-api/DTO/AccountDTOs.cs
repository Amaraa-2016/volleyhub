namespace volleyhub_api.DTO;

// ---- auth -----------------------------------------------------------------

public class Token
{
    public string token { get; set; } = string.Empty;
    public DateTime expirydate { get; set; }
}

public class AccountRegisterBT
{
    public string phone { get; set; } = string.Empty;
    public string password { get; set; } = string.Empty;
    public string? lastname { get; set; }
    public string? firstname { get; set; }
}

public class AccountLoginBT
{
    public string phone { get; set; } = string.Empty;
    public string password { get; set; } = string.Empty;
}

// What the caller belongs to. `staffid` is 0 for members who are not staff (a player or a fan).
public class TenantMembershipRT
{
    public int tenantid { get; set; }
    public string tenantname { get; set; } = string.Empty;
    public string role { get; set; } = string.Empty;
    public string status { get; set; } = string.Empty;
    public int staffid { get; set; }
    public string? logo { get; set; }
}

public class SwitchTenantBT
{
    public int tenantid { get; set; }
}

// A per-club token plus the identity it carries, handed to the caller after a switch.
public class SwitchTenantRT
{
    public int tenantid { get; set; }
    public string tenantname { get; set; } = string.Empty;
    public string role { get; set; } = string.Empty;
    public int staffid { get; set; }
    public string token { get; set; } = string.Empty;
    public DateTime expirydate { get; set; }
}

// Login/register response. `selected` is filled in when the account belongs to exactly one club,
// so single-club users never see a club picker.
public class AccountLoginRT
{
    public int accountid { get; set; }
    public string phone { get; set; } = string.Empty;
    public string? name { get; set; }
    public string? lastname { get; set; }
    public string? firstname { get; set; }
    public string? photo { get; set; }
    public string token { get; set; } = string.Empty;
    public DateTime expirydate { get; set; }
    public bool isplatformadmin { get; set; }
    public List<TenantMembershipRT> tenants { get; set; } = new();
    public SwitchTenantRT? selected { get; set; }
}

public class AccountProfileBT
{
    public string? lastname { get; set; }
    public string? firstname { get; set; }
    public string? photo { get; set; }
}

public class ChangePasswordBT
{
    public string oldpassword { get; set; } = string.Empty;
    public string newpassword { get; set; } = string.Empty;
}

// ---- club registration / membership ---------------------------------------

public class TenantRequestBT
{
    public string tenantname { get; set; } = string.Empty;
    public string? registernumber { get; set; }
    public string? address { get; set; }
    public string? contactphone { get; set; }
    public string? logo { get; set; }
    public string? email { get; set; }
    public string? tagline { get; set; }
}

public class TenantRequestRT
{
    public int tenantrequestid { get; set; }
    public int accountid { get; set; }
    public string? applicantname { get; set; }
    public string? applicantphone { get; set; }
    public string tenantname { get; set; } = string.Empty;
    public string? registernumber { get; set; }
    public string? address { get; set; }
    public string? contactphone { get; set; }
    public string? logo { get; set; }
    public string? email { get; set; }
    public string? tagline { get; set; }
    public string status { get; set; } = string.Empty;
    public string? note { get; set; }
    public int? tenantid { get; set; }
    public DateTime created { get; set; }
    public DateTime? reviewedat { get; set; }
}

public class ReviewRequestBT
{
    public string? note { get; set; }
}

// A club a user can ask to join, as returned by the public search.
public class TenantSearchRT
{
    public int tenantid { get; set; }
    public string tenantname { get; set; } = string.Empty;
    public string? address { get; set; }
    public string? logo { get; set; }
}

public class JoinRequestBT
{
    public int tenantid { get; set; }
    // player | fan | coach - what the applicant is asking to be. An admin confirms it on approval.
    public string role { get; set; } = "player";
}

// A member of the current club, for the backoffice member list.
public class MemberRT
{
    public int accounttenantid { get; set; }
    public int accountid { get; set; }
    public string phone { get; set; } = string.Empty;
    public string? lastname { get; set; }
    public string? firstname { get; set; }
    public string role { get; set; } = string.Empty;
    public string status { get; set; } = string.Empty;
    public int staffid { get; set; }
    public DateTime joined { get; set; }
}

public class MemberActionBT
{
    // owner | admin | coach | player | fan
    public string? role { get; set; }
}
