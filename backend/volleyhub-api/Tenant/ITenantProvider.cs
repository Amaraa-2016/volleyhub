using volleyhub_api.Data;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Tenancy;

public interface ITenantProvider
{
    int GetTenantId();
    string GetSchema();
}

// Resolves the club from the tenantid request header, then checks the caller is actually a member
// of it. Without that check a logged-in user could reach another club by editing the header.
public class HttpTenantProvider : ITenantProvider
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly SharedDbContext _sharedDb;
    private readonly AccountDbContext _accountDb;

    public HttpTenantProvider(IHttpContextAccessor httpContextAccessor, SharedDbContext sharedDb, AccountDbContext accountDb)
    {
        _httpContextAccessor = httpContextAccessor;
        _sharedDb = sharedDb;
        _accountDb = accountDb;
    }

    public int GetTenantId()
    {
        var http = _httpContextAccessor.HttpContext;
        var raw = http?.Request.Headers["tenantid"].FirstOrDefault()
            ?? http?.Request.Query["tenantid"].FirstOrDefault()
            ?? throw new UnauthorizedAccessException("Tenant ID not provided");

        return int.TryParse(raw, out var id)
            ? id
            : throw new UnauthorizedAccessException("Invalid tenant");
    }

    public string GetSchema()
    {
        var tenantId = GetTenantId();
        var tenant = _sharedDb.tenant
            .AsNoTracking()
            .FirstOrDefault(t => t.tenantid == tenantId && t.isactive)
            ?? throw new UnauthorizedAccessException("Invalid tenant");

        var accountIdStr = _httpContextAccessor.HttpContext?.User.FindFirst("accountid")?.Value;
        if (int.TryParse(accountIdStr, out int accountId) && accountId > 0)
        {
            var isMember = _accountDb.account_tenant
                .AsNoTracking()
                .Any(m => m.accountid == accountId && m.tenantid == tenantId && m.status == "active");
            if (!isMember)
                throw new UnauthorizedAccessException("Not a member of this tenant");
        }

        return "tenant_" + tenant.tenantid;
    }
}

// Used by startup, schema provisioning and seeding, where there is no HTTP context.
public class FixedTenantProvider : ITenantProvider
{
    private readonly string _schema;
    public FixedTenantProvider(string schema) => _schema = schema;
    public int GetTenantId() => 0;
    public string GetSchema() => _schema;
}
