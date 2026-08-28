namespace volleyhub_api.Tenancy;

// Implemented by every per-tenant DbContext so shared infrastructure (the schema-aware model cache
// key factory) can read the resolved schema without knowing the concrete context type.
public interface ITenantDbContext
{
    string Schema { get; }
}
