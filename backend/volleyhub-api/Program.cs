using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using volleyhub_api.Data;
using volleyhub_api.Service;
using volleyhub_api.Tenancy;
using Newtonsoft.Json.Serialization;
using Swashbuckle.AspNetCore.Filters;
using Microsoft.OpenApi.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddScoped<AccountService>();
builder.Services.AddScoped<TrainingService>();
builder.Services.AddScoped<ScheduleService>();
builder.Services.AddScoped<BillingService>();
builder.Services.AddScoped<PlatformContentService>();
builder.Services.AddScoped<PublicSiteService>();
builder.Services.AddSingleton<volleyhub_api.Service.Storage.IFileStorage,
    volleyhub_api.Service.Storage.S3FileStorage>();

builder.Services.AddControllers().AddNewtonsoftJson(options =>
{
    // Every DateTime is UTC on the wire: incoming values carrying an offset are converted (Npgsql
    // requires Kind=Utc for timestamptz), outgoing ones serialize as ISO 8601 with a trailing Z.
    // Clients render in their own timezone - the backend never converts to a display timezone.
    options.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore;
    options.SerializerSettings.ContractResolver = new DefaultContractResolver();
    options.SerializerSettings.DateTimeZoneHandling = Newtonsoft.Json.DateTimeZoneHandling.Utc;
    options.SerializerSettings.DateParseHandling = Newtonsoft.Json.DateParseHandling.DateTime;
    options.SerializerSettings.DateFormatHandling = Newtonsoft.Json.DateFormatHandling.IsoDateFormat;
});

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Volleyhub API", Version = "v1" });
    options.AddSecurityDefinition("oauth2", new OpenApiSecurityScheme
    {
        Description = "Standard Authorization header using the Bearer scheme (\"bearer {token}\")",
        In = ParameterLocation.Header,
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey
    });
    options.OperationFilter<SecurityRequirementsOperationFilter>();
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Claims arrive under the names we actually put in the token. Without this the handler
        // rewrites well-known short names to their SOAP-era URIs, and every User.FindFirst("role")
        // silently returns null - which would let a player through the backoffice role gate.
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8
                .GetBytes(builder.Configuration["AppSettings:Token"] ?? "")),
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            // The default allows 5 minutes of slack, which would quietly extend every token.
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    });
});

var connStr = builder.Configuration["ConnectionStrings:dbCon"];

// Shared (public) schema - the club registry.
builder.Services.AddDbContext<SharedDbContext>(option => option.UseNpgsql(connStr));

// Shared (public) schema - identity, membership, registration applications. Tenant-independent, so
// anonymous account endpoints work with no tenantid header.
builder.Services.AddDbContext<AccountDbContext>(option => option.UseNpgsql(connStr));

// Tenant context - the schema is resolved per request via ITenantProvider.
builder.Services.AddDbContext<VolleyDbContext>(option => option
    .UseNpgsql(connStr)
    .ReplaceService<IModelCacheKeyFactory, SchemaAwareModelCacheKeyFactory>());

builder.Services.AddScoped<ITenantProvider, HttpTenantProvider>();
builder.Services.AddScoped<TenantSchemaManager>();

builder.Services.AddMemoryCache();
builder.Services.AddHttpContextAccessor();
builder.Services.AddHttpClient();

var app = builder.Build();

// Bootstrap the public schema, then create or column-sync a schema per club. Idempotent, so it
// runs on every start and a deploy that adds a column needs no migration step.
using (var scope = app.Services.CreateScope())
{
    var schemaManager = scope.ServiceProvider.GetRequiredService<TenantSchemaManager>();
    await schemaManager.EnsureSharedSchema();
    await schemaManager.EnsureAccountSchema();

    var sharedDb = scope.ServiceProvider.GetRequiredService<SharedDbContext>();
    var tenants = await sharedDb.tenant.AsNoTracking().ToListAsync();
    foreach (var tenant in tenants)
    {
        await schemaManager.CreateSchemaForTenant("tenant_" + tenant.tenantid, tenant.tenantid);
    }
}

app.UseCors("AllowAll");

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
