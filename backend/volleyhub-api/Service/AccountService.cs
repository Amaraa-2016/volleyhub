using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Model;
using volleyhub_api.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace volleyhub_api.Service;

// Tenant-independent service for the global identity layer (public schema): register, login, the
// coach's own workspace. Deliberately does NOT depend on the per-request VolleyDbContext, so its
// endpoints work with no tenantid header.
public class AccountService
{
    private readonly AccountDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<AccountService> _logger;
    private readonly TenantSchemaManager _schemaManager;

    // Roles that may act on the backoffice. Only "owner" is created now; the others survive from the
    // earlier multi-role platform so old memberships still resolve.
    private static readonly string[] StaffRoles = ["owner", "admin", "coach"];

    public AccountService(AccountDbContext db, IConfiguration config, ILogger<AccountService> logger,
        TenantSchemaManager schemaManager)
    {
        _db = db;
        _config = config;
        _logger = logger;
        _schemaManager = schemaManager;
    }

    // ---- helpers ----------------------------------------------------------

    private static string Norm(string? s) => (s ?? string.Empty).Trim();

    // owner/admin manage the club, coach runs a squad. Maps onto the roles seeded per tenant
    // (1=Admin, 2=Manager, 3=Coach, 4=Staff).
    private static int RoleToRoleId(string role) => role switch
    {
        "owner" => 1,
        "admin" => 1,
        "coach" => 3,
        _ => 4,
    };

    private Token WriteToken(List<Claim> claims)
    {
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

    private Token GenerateAccountToken(Account account)
    {
        var claims = new List<Claim>
        {
            new("accountid", account.accountid.ToString()),
            new("phone", account.phone),
        };
        return WriteToken(claims);
    }

    // Per-club token. The tenant provider cross-checks accountid against account_tenant, so a
    // tampered tenantid header cannot reach another club.
    private Token GenerateTenantToken(int accountId, int tenantId, string phone, string role, int staffId)
    {
        var claims = new List<Claim>
        {
            new("accountid", accountId.ToString()),
            new("tenantid", tenantId.ToString()),
            new("phone", phone),
            new("role", role),
            new("staffid", staffId.ToString()),
        };
        return WriteToken(claims);
    }

    private async Task<List<TenantMembershipRT>> Memberships(int accountId)
    {
        return await (from m in _db.account_tenant.AsNoTracking()
                      join t in _db.tenant.AsNoTracking() on m.tenantid equals t.tenantid
                      where m.accountid == accountId && t.isactive
                      orderby t.tenantname
                      select new TenantMembershipRT
                      {
                          tenantid = t.tenantid,
                          tenantname = t.tenantname,
                          role = m.role,
                          status = m.status,
                          staffid = m.staffid,
                          logo = t.logo,
                      }).ToListAsync();
    }

    // Every coach has exactly one workspace of their own. Registration creates it; an account that
    // somehow has none (one registered under the old platform without running a centre) gets it
    // here on its next login, so nobody is ever left at a "pick a club" screen with nothing in it.
    private async Task EnsureWorkspace(Account account)
    {
        // Only a membership that can actually run the app counts: an old "player" or "fan"
        // membership in someone else's club is not a workspace.
        var hasOne = await _db.account_tenant.AnyAsync(m => m.accountid == account.accountid
            && m.status == "active" && StaffRoles.Contains(m.role));
        if (hasOne) return;

        var tenant = new Tenant
        {
            tenantname = WorkspaceName(account),
            contactphone = account.phone,
            locale = "mn",
            currency = "MNT",
            isactive = true,
            createdby = account.accountid,
            created = DateTime.UtcNow,
        };
        _db.tenant.Add(tenant);
        await _db.SaveChangesAsync();

        var schema = "tenant_" + tenant.tenantid;
        await _schemaManager.CreateSchemaForTenant(schema, tenant.tenantid, seedDemoData: false);

        var staffId = await _schemaManager.ProvisionStaff(
            schema, tenant.tenantid, account.phone, account.name,
            account.passwordhash, RoleToRoleId("owner"),
            account.lastname, account.firstname, account.accountid);

        _db.account_tenant.Add(new AccountTenant
        {
            accountid = account.accountid,
            tenantid = tenant.tenantid,
            role = "owner",
            status = "active",
            staffid = staffId,
            joined = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        _logger.LogInformation("Workspace {Tenant} created for account {Account}", tenant.tenantid, account.accountid);
    }

    private static string WorkspaceName(Account account) =>
        NameHelper.JoinFullName(account.lastname, account.firstname) ?? account.name ?? account.phone;

    private async Task<AccountLoginRT> BuildLoginResult(Account account)
    {
        await EnsureWorkspace(account);

        var token = GenerateAccountToken(account);
        var tenants = await Memberships(account.accountid);

        var result = new AccountLoginRT
        {
            accountid = account.accountid,
            phone = account.phone,
            name = NameHelper.JoinFullName(account.lastname, account.firstname) ?? account.name,
            lastname = account.lastname,
            firstname = account.firstname,
            photo = account.photo,
            token = token.token,
            expirydate = token.expirydate,
            tenants = tenants,
        };

        // Select the workspace up front. A coach has one; an account left with several from the
        // old platform opens the one it owns, else the first.
        var active = tenants.Where(t => t.status == "active" && StaffRoles.Contains(t.role)).ToList();
        var pick = active.FirstOrDefault(t => t.role == "owner") ?? active.FirstOrDefault();
        if (pick != null)
            result.selected = await Switch(account.accountid, pick.tenantid);

        return result;
    }

    // ---- auth -------------------------------------------------------------

    public async Task<AccountLoginRT> Register(AccountRegisterBT data)
    {
        var phone = Norm(data.phone);
        if (phone.Length == 0) throw new ArgumentException("phone_required");
        if (Norm(data.password).Length < 6) throw new ArgumentException("password_too_short");
        // The workspace is named after the coach, so a name is needed from the start.
        if (Norm(data.firstname).Length == 0) throw new ArgumentException("first_name_required");

        if (await _db.account.AnyAsync(a => a.phone == phone))
            throw new InvalidOperationException("phone_taken");

        var account = new Account
        {
            phone = phone,
            passwordhash = PasswordHasher.Hash(data.password),
            lastname = Norm(data.lastname) is { Length: > 0 } ln ? ln : null,
            firstname = Norm(data.firstname) is { Length: > 0 } fn ? fn : null,
            isactive = true,
            created = DateTime.UtcNow,
        };
        account.name = NameHelper.JoinFullName(account.lastname, account.firstname);

        _db.account.Add(account);
        await _db.SaveChangesAsync();

        return await BuildLoginResult(account);
    }

    public async Task<AccountLoginRT> Login(AccountLoginBT data)
    {
        var phone = Norm(data.phone);
        var account = await _db.account.FirstOrDefaultAsync(a => a.phone == phone && a.isactive)
            ?? throw new UnauthorizedAccessException("invalid_credentials");

        if (!PasswordHasher.Verify(data.password ?? "", account.passwordhash))
            throw new UnauthorizedAccessException("invalid_credentials");

        return await BuildLoginResult(account);
    }

    public async Task<AccountLoginRT> Me(int accountId)
    {
        var account = await _db.account.FirstOrDefaultAsync(a => a.accountid == accountId && a.isactive)
            ?? throw new UnauthorizedAccessException("account_not_found");
        return await BuildLoginResult(account);
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

    // ---- clubs ------------------------------------------------------------

    public Task<List<TenantMembershipRT>> Tenants(int accountId) => Memberships(accountId);

    // Issue a token for one club the caller is an active member of.
    public async Task<SwitchTenantRT> Switch(int accountId, int tenantId)
    {
        var membership = await _db.account_tenant
            .FirstOrDefaultAsync(m => m.accountid == accountId && m.tenantid == tenantId)
            ?? throw new UnauthorizedAccessException("not_a_member");

        if (membership.status != "active")
            throw new UnauthorizedAccessException("membership_" + membership.status);

        var tenant = await _db.tenant.AsNoTracking()
            .FirstOrDefaultAsync(t => t.tenantid == tenantId && t.isactive)
            ?? throw new UnauthorizedAccessException("invalid_tenant");

        var account = await _db.account.AsNoTracking().FirstAsync(a => a.accountid == accountId);

        // Staff-role members need a row inside the club schema; materialise it lazily so a role
        // promoted after the fact still resolves.
        if (membership.staffid == 0 && StaffRoles.Contains(membership.role))
        {
            membership.staffid = await _schemaManager.ProvisionStaff(
                "tenant_" + tenantId, tenantId, account.phone, account.name,
                account.passwordhash, RoleToRoleId(membership.role),
                account.lastname, account.firstname, accountId);
            await _db.SaveChangesAsync();
        }

        var token = GenerateTenantToken(accountId, tenantId, account.phone, membership.role, membership.staffid);
        return new SwitchTenantRT
        {
            tenantid = tenantId,
            tenantname = tenant.tenantname,
            role = membership.role,
            staffid = membership.staffid,
            token = token.token,
            expirydate = token.expirydate,
        };
    }
}
