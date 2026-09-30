namespace volleyhub_api.DTO;

public class Token
{
    public string token { get; set; } = string.Empty;
    public DateTime expirydate { get; set; }
}

public class AccountRegisterBT
{
    // The training's name ("Од волейболын сургалт") - becomes the workspace name.
    public string? tenantname { get; set; }
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

// A workspace the account can open. For a coach this is exactly one: their own.
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

// A per-workspace token, sent with the tenantid header on every /api/vh/backoffice call.
public class SwitchTenantRT
{
    public int tenantid { get; set; }
    public string tenantname { get; set; } = string.Empty;
    public string role { get; set; } = string.Empty;
    public int staffid { get; set; }
    public string token { get; set; } = string.Empty;
    public DateTime expirydate { get; set; }
}

// What login and register return: the account token, the workspaces, and - because a coach has
// one - that workspace's token already selected.
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
