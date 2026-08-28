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

// Tenant-independent service for the global identity layer (public schema). Deliberately does NOT
// depend on the per-request VolleyDbContext, so its endpoints work with no tenantid header.
public class AccountService
{
    private readonly AccountDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<AccountService> _logger;
    private readonly TenantSchemaManager _schemaManager;

    // Roles that may act on the backoffice. Everyone else (player, fan) gets a token too, but the
    // backoffice controllers refuse them.
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

    private Token GenerateAccountToken(Account account, bool isPlatformAdmin)
    {
        var claims = new List<Claim>
        {
            new("accountid", account.accountid.ToString()),
            new("phone", account.phone),
        };
        // Routing/UI convenience only - every platform endpoint re-reads public.platform_admin, so
        // a stale token can never grant access.
        if (isPlatformAdmin) claims.Add(new Claim("platformadmin", "1"));
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

    // Phones listed in Platform:AdminPhones are promoted on registration and at every login, so an
    // operator configured before the first signup gets the role without a manual database edit.
    private async Task<bool> EnsurePlatformAdmin(Account account)
    {
        var existing = await _db.platform_admin.FirstOrDefaultAsync(p => p.accountid == account.accountid);
        if (existing != null) return true;

        var configured = _config.GetSection("Platform:AdminPhones").Get<string[]>() ?? [];
        var envList = (_config["PLATFORM_ADMIN_PHONES"] ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var all = configured.Concat(envList).Select(Norm).Where(p => p.Length > 0).ToHashSet();

        if (!all.Contains(account.phone)) return false;

        _db.platform_admin.Add(new PlatformAdmin
        {
            accountid = account.accountid,
            phone = account.phone,
            created = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
        return true;
    }

    public Task<bool> IsPlatformAdmin(int accountId) =>
        _db.platform_admin.AsNoTracking().AnyAsync(p => p.accountid == accountId);

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

    private async Task<AccountLoginRT> BuildLoginResult(Account account)
    {
        var isAdmin = await EnsurePlatformAdmin(account);
        var token = GenerateAccountToken(account, isAdmin);
        var tenants = await Memberships(account.accountid);

        var result = new AccountLoginRT
        {
            accountid = account.accountid,
            phone = account.phone,
            name = NameHelper.JoinFullName(account.lastname, account.firstname) ?? account.name,
            lastname = account.lastname,
            firstname = account.firstname,
            token = token.token,
            expirydate = token.expirydate,
            isplatformadmin = isAdmin,
            tenants = tenants,
        };

        // Exactly one active club - select it up front so a single-club user never sees a picker.
        var active = tenants.Where(t => t.status == "active").ToList();
        if (active.Count == 1)
            result.selected = await Switch(account.accountid, active[0].tenantid);

        return result;
    }

    // ---- auth -------------------------------------------------------------

    public async Task<AccountLoginRT> Register(AccountRegisterBT data)
    {
        var phone = Norm(data.phone);
        if (phone.Length == 0) throw new ArgumentException("phone_required");
        if (Norm(data.password).Length < 6) throw new ArgumentException("password_too_short");

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
        account.name = NameHelper.JoinFullName(account.lastname, account.firstname);
        await _db.SaveChangesAsync();

        return new { account.accountid, account.name, account.lastname, account.firstname };
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

    public async Task<List<TenantSearchRT>> SearchTenants(string? q)
    {
        var term = Norm(q).ToLowerInvariant();
        var query = _db.tenant.AsNoTracking().Where(t => t.isactive);
        if (term.Length > 0)
            query = query.Where(t => t.tenantname.ToLower().Contains(term));

        return await query.OrderBy(t => t.tenantname).Take(50)
            .Select(t => new TenantSearchRT
            {
                tenantid = t.tenantid,
                tenantname = t.tenantname,
                address = t.address,
                logo = t.logo,
            }).ToListAsync();
    }

    // Apply to register a club. A tenant row appears only once a platform admin approves.
    public async Task<TenantRequestRT> RequestTenant(int accountId, TenantRequestBT data)
    {
        var name = Norm(data.tenantname);
        if (name.Length == 0) throw new ArgumentException("tenantname_required");

        if (await _db.tenant.AnyAsync(t => t.tenantname.ToLower() == name.ToLower()))
            throw new InvalidOperationException("tenant_name_taken");
        if (await _db.tenant_request.AnyAsync(r => r.accountid == accountId && r.status == "pending"))
            throw new InvalidOperationException("request_already_pending");

        var request = new TenantRequest
        {
            accountid = accountId,
            tenantname = name,
            registernumber = Norm(data.registernumber) is { Length: > 0 } rn ? rn : null,
            address = Norm(data.address) is { Length: > 0 } ad ? ad : null,
            contactphone = Norm(data.contactphone) is { Length: > 0 } cp ? cp : null,
            status = "pending",
            created = DateTime.UtcNow,
        };
        _db.tenant_request.Add(request);
        await _db.SaveChangesAsync();

        return ToRequestRT(request, null);
    }

    public async Task<List<TenantRequestRT>> MyRequests(int accountId)
    {
        var rows = await _db.tenant_request.AsNoTracking()
            .Where(r => r.accountid == accountId)
            .OrderByDescending(r => r.created)
            .ToListAsync();
        return rows.Select(r => ToRequestRT(r, null)).ToList();
    }

    // Ask to join an existing club. Lands as a pending membership an admin reviews.
    public async Task<object> RequestJoin(int accountId, JoinRequestBT data)
    {
        var tenant = await _db.tenant.AsNoTracking()
            .FirstOrDefaultAsync(t => t.tenantid == data.tenantid && t.isactive)
            ?? throw new InvalidOperationException("invalid_tenant");

        var role = data.role is "player" or "fan" or "coach" ? data.role : "player";

        var existing = await _db.account_tenant
            .FirstOrDefaultAsync(m => m.accountid == accountId && m.tenantid == tenant.tenantid);
        if (existing != null)
            return new { status = existing.status, role = existing.role };

        _db.account_tenant.Add(new AccountTenant
        {
            accountid = accountId,
            tenantid = tenant.tenantid,
            role = role,
            status = "pending",
            joined = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();
        return new { status = "pending", role };
    }

    // ---- club members (public schema, used by the backoffice) -------------

    public async Task<List<MemberRT>> Members(int tenantId, string? status)
    {
        var query = from m in _db.account_tenant.AsNoTracking()
                    join a in _db.account.AsNoTracking() on m.accountid equals a.accountid
                    where m.tenantid == tenantId
                    select new MemberRT
                    {
                        accounttenantid = m.accounttenantid,
                        accountid = a.accountid,
                        phone = a.phone,
                        lastname = a.lastname,
                        firstname = a.firstname,
                        role = m.role,
                        status = m.status,
                        staffid = m.staffid,
                        joined = m.joined,
                    };

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(m => m.status == status);

        return await query.OrderBy(m => m.status).ThenBy(m => m.lastname).ToListAsync();
    }

    public async Task<object> ApproveMember(int tenantId, int accountTenantId, MemberActionBT data)
    {
        var membership = await _db.account_tenant
            .FirstOrDefaultAsync(m => m.accounttenantid == accountTenantId && m.tenantid == tenantId)
            ?? throw new InvalidOperationException("member_not_found");

        if (!string.IsNullOrWhiteSpace(data.role)) membership.role = data.role!;
        membership.status = "active";
        membership.joined = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return new { membership.accounttenantid, membership.role, membership.status };
    }

    public async Task<object> SetMemberRole(int tenantId, int accountTenantId, MemberActionBT data)
    {
        var membership = await _db.account_tenant
            .FirstOrDefaultAsync(m => m.accounttenantid == accountTenantId && m.tenantid == tenantId)
            ?? throw new InvalidOperationException("member_not_found");

        if (membership.role == "owner")
            throw new InvalidOperationException("cannot_change_owner");
        if (string.IsNullOrWhiteSpace(data.role))
            throw new ArgumentException("role_required");

        membership.role = data.role!;
        // The club-schema staff row is re-provisioned on the next switch with the new role.
        membership.staffid = 0;
        await _db.SaveChangesAsync();
        return new { membership.accounttenantid, membership.role };
    }

    public async Task<object> RemoveMember(int tenantId, int accountTenantId)
    {
        var membership = await _db.account_tenant
            .FirstOrDefaultAsync(m => m.accounttenantid == accountTenantId && m.tenantid == tenantId)
            ?? throw new InvalidOperationException("member_not_found");

        if (membership.role == "owner")
            throw new InvalidOperationException("cannot_remove_owner");

        _db.account_tenant.Remove(membership);
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    // ---- platform admin ---------------------------------------------------

    public async Task<List<TenantRequestRT>> ListRequests(string? status)
    {
        var query = from r in _db.tenant_request.AsNoTracking()
                    join a in _db.account.AsNoTracking() on r.accountid equals a.accountid into ga
                    from a in ga.DefaultIfEmpty()
                    select new { r, a };

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(x => x.r.status == status);

        var rows = await query.OrderByDescending(x => x.r.created).ToListAsync();
        return rows.Select(x => ToRequestRT(x.r, x.a)).ToList();
    }

    // Approving is the only place a club comes into existence: the tenant row, its schema, the
    // applicant as owner, and the staff row inside the schema, in that order.
    public async Task<TenantRequestRT> ApproveRequest(int requestId, int adminAccountId, ReviewRequestBT data)
    {
        var request = await _db.tenant_request.FirstOrDefaultAsync(r => r.tenantrequestid == requestId)
            ?? throw new InvalidOperationException("request_not_found");
        if (request.status != "pending")
            throw new InvalidOperationException("request_already_reviewed");

        var applicant = await _db.account.AsNoTracking().FirstOrDefaultAsync(a => a.accountid == request.accountid)
            ?? throw new InvalidOperationException("applicant_not_found");

        var tenant = new Tenant
        {
            tenantname = request.tenantname,
            registernumber = request.registernumber,
            address = request.address,
            contactphone = request.contactphone,
            locale = "mn",
            currency = "MNT",
            isactive = true,
            createdby = request.accountid,
            created = DateTime.UtcNow,
        };
        _db.tenant.Add(tenant);
        await _db.SaveChangesAsync();

        var schema = "tenant_" + tenant.tenantid;
        await _schemaManager.CreateSchemaForTenant(schema, tenant.tenantid, seedDemoData: false);

        var staffId = await _schemaManager.ProvisionStaff(
            schema, tenant.tenantid, applicant.phone, applicant.name,
            applicant.passwordhash, RoleToRoleId("owner"),
            applicant.lastname, applicant.firstname, applicant.accountid);

        _db.account_tenant.Add(new AccountTenant
        {
            accountid = request.accountid,
            tenantid = tenant.tenantid,
            role = "owner",
            status = "active",
            staffid = staffId,
            joined = DateTime.UtcNow,
        });

        request.status = "approved";
        request.tenantid = tenant.tenantid;
        request.note = data?.note;
        request.reviewedby = adminAccountId;
        request.reviewedat = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Club {Tenant} approved from request {Request}", tenant.tenantid, requestId);
        return ToRequestRT(request, applicant);
    }

    public async Task<TenantRequestRT> RejectRequest(int requestId, int adminAccountId, ReviewRequestBT data)
    {
        var request = await _db.tenant_request.FirstOrDefaultAsync(r => r.tenantrequestid == requestId)
            ?? throw new InvalidOperationException("request_not_found");
        if (request.status != "pending")
            throw new InvalidOperationException("request_already_reviewed");

        request.status = "rejected";
        request.note = data?.note;
        request.reviewedby = adminAccountId;
        request.reviewedat = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return ToRequestRT(request, null);
    }

    public async Task<List<TenantSearchRT>> AllTenants()
    {
        return await _db.tenant.AsNoTracking()
            .OrderBy(t => t.tenantname)
            .Select(t => new TenantSearchRT
            {
                tenantid = t.tenantid,
                tenantname = t.tenantname,
                address = t.address,
                logo = t.logo,
            }).ToListAsync();
    }

    private static TenantRequestRT ToRequestRT(TenantRequest r, Account? applicant) => new()
    {
        tenantrequestid = r.tenantrequestid,
        accountid = r.accountid,
        applicantname = applicant?.name,
        applicantphone = applicant?.phone,
        tenantname = r.tenantname,
        registernumber = r.registernumber,
        address = r.address,
        contactphone = r.contactphone,
        status = r.status,
        note = r.note,
        tenantid = r.tenantid,
        created = r.created,
        reviewedat = r.reviewedat,
    };
}
