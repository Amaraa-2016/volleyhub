using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Model;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace volleyhub_api.Service;

// The coach's identity: register, login, profile. Registering creates the account row and nothing
// else - no tenant, no schema. The coach's data lives in the shared app schema under their
// accountid, so the account token is all the backoffice needs.
public class AccountService
{
    private readonly AccountDbContext _db;
    private readonly IConfiguration _config;

    public AccountService(AccountDbContext db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    // ---- helpers ----------------------------------------------------------

    private static string Norm(string? s) => (s ?? string.Empty).Trim();

    // The token every backoffice call carries. accountid is the owner of everything the coach sees;
    // role/staffid keep the claim names the controllers already read.
    private Token GenerateToken(Account account)
    {
        var claims = new List<Claim>
        {
            new("accountid", account.accountid.ToString()),
            new("phone", account.phone),
            new("role", "owner"),
            new("staffid", account.accountid.ToString()),
        };
        var days = int.TryParse(_config["AppSettings:TokenLifetimeDays"], out var d) ? d : 7;
        var expirydate = DateTime.UtcNow.AddDays(days);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["AppSettings:Token"] ?? ""));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);
        var token = new JwtSecurityToken(claims: claims, expires: expirydate, signingCredentials: creds);
        return new Token
        {
            token = new JwtSecurityTokenHandler().WriteToken(token),
            expirydate = expirydate,
        };
    }

    // An account from before trainings were named on the account falls back to the coach's name.
    public static string TrainingName(Account a) =>
        a.training_name is { Length: > 0 } t ? t
            : NameHelper.JoinFullName(a.lastname, a.firstname) ?? a.name ?? a.phone;

    private AccountLoginRT LoginResult(Account account)
    {
        var token = GenerateToken(account);
        return new AccountLoginRT
        {
            accountid = account.accountid,
            phone = account.phone,
            name = NameHelper.JoinFullName(account.lastname, account.firstname) ?? account.name,
            lastname = account.lastname,
            firstname = account.firstname,
            photo = account.photo,
            training_name = TrainingName(account),
            token = token.token,
            expirydate = token.expirydate,
        };
    }

    // ---- auth -------------------------------------------------------------

    public async Task<AccountLoginRT> Register(AccountRegisterBT data)
    {
        var phone = Norm(data.phone);
        if (phone.Length == 0) throw new ArgumentException("phone_required");
        if (Norm(data.password).Length < 6) throw new ArgumentException("password_too_short");
        var trainingName = Norm(data.tenantname);
        if (trainingName.Length == 0) throw new ArgumentException("training_name_required");
        if (Norm(data.lastname).Length == 0) throw new ArgumentException("last_name_required");
        if (Norm(data.firstname).Length == 0) throw new ArgumentException("first_name_required");

        if (await _db.account.AnyAsync(a => a.phone == phone))
            throw new InvalidOperationException("phone_taken");

        var account = new Account
        {
            phone = phone,
            passwordhash = PasswordHasher.Hash(data.password),
            lastname = Norm(data.lastname),
            firstname = Norm(data.firstname),
            training_name = trainingName,
            contactphone = phone,
            isactive = true,
            created = DateTime.UtcNow,
        };
        account.name = NameHelper.JoinFullName(account.lastname, account.firstname);

        // One insert: the account is the whole workspace, so there is nothing to half-create.
        _db.account.Add(account);
        await _db.SaveChangesAsync();

        return LoginResult(account);
    }

    public async Task<AccountLoginRT> Login(AccountLoginBT data)
    {
        var phone = Norm(data.phone);
        var account = await _db.account.FirstOrDefaultAsync(a => a.phone == phone && a.isactive)
            ?? throw new UnauthorizedAccessException("invalid_credentials");

        if (!PasswordHasher.Verify(data.password ?? "", account.passwordhash))
            throw new UnauthorizedAccessException("invalid_credentials");

        return LoginResult(account);
    }

    public async Task<AccountLoginRT> Me(int accountId)
    {
        var account = await _db.account.FirstOrDefaultAsync(a => a.accountid == accountId && a.isactive)
            ?? throw new UnauthorizedAccessException("account_not_found");
        return LoginResult(account);
    }

    public async Task<object> UpdateProfile(int accountId, AccountProfileBT data)
    {
        var account = await _db.account.FirstOrDefaultAsync(a => a.accountid == accountId)
            ?? throw new UnauthorizedAccessException("account_not_found");

        account.lastname = Norm(data.lastname) is { Length: > 0 } ln ? ln : null;
        account.firstname = Norm(data.firstname) is { Length: > 0 } fn ? fn : null;
        account.photo = Norm(data.photo) is { Length: > 0 } ph ? ph : null;
        account.name = NameHelper.JoinFullName(account.lastname, account.firstname);
        await _db.SaveChangesAsync();

        return new { account.accountid, account.name, account.lastname, account.firstname, account.photo };
    }

    public async Task<object> ChangePassword(int accountId, ChangePasswordBT data)
    {
        var account = await _db.account.FirstOrDefaultAsync(a => a.accountid == accountId)
            ?? throw new UnauthorizedAccessException("account_not_found");

        if (!PasswordHasher.Verify(data.oldpassword ?? "", account.passwordhash))
            throw new InvalidOperationException("wrong_password");
        if (Norm(data.newpassword).Length < 6)
            throw new ArgumentException("password_too_short");

        account.passwordhash = PasswordHasher.Hash(data.newpassword);
        await _db.SaveChangesAsync();
        return new { ok = true };
    }
}
