namespace volleyhub_api.DTO;

public class Token
{
    public string token { get; set; } = string.Empty;
    public DateTime expirydate { get; set; }
}

public class AccountRegisterBT
{
    // The training's name ("Од волейболын сургалт") - stored on the account.
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

// What login and register return: the coach and the one token every call carries.
public class AccountLoginRT
{
    public int accountid { get; set; }
    public string phone { get; set; } = string.Empty;
    public string? name { get; set; }
    public string? lastname { get; set; }
    public string? firstname { get; set; }
    public string? photo { get; set; }
    public string training_name { get; set; } = string.Empty;
    public string token { get; set; } = string.Empty;
    public DateTime expirydate { get; set; }
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
