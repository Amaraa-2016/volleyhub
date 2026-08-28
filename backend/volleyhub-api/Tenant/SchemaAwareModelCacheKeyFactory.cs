using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace volleyhub_api.Tenancy;

// EF caches one compiled model per context type. Every tenant maps the same entities into a
// different schema, so the schema has to be part of the cache key or the first tenant to be served
// would pin its schema for the whole process.
public class SchemaAwareModelCacheKeyFactory : IModelCacheKeyFactory
{
    public object Create(DbContext context, bool designTime)
    {
        var tenantContext = (ITenantDbContext)context;
        return (context.GetType(), tenantContext.Schema, designTime);
    }
}
