namespace volleyhub_api.Ownership;

// Who the request is acting for: the coach's accountid from the JWT. 0 means nobody - the data
// context then reads nothing and refuses to write.
public interface ICurrentOwner
{
    int OwnerId { get; }
}

public class HttpCurrentOwner : ICurrentOwner
{
    private readonly IHttpContextAccessor _http;
    public HttpCurrentOwner(IHttpContextAccessor http) => _http = http;

    public int OwnerId =>
        int.TryParse(_http.HttpContext?.User.FindFirst("accountid")?.Value, out var id) && id > 0 ? id : 0;
}

// Startup and schema work, where there is no request.
public class FixedOwner : ICurrentOwner
{
    public FixedOwner(int ownerId) => OwnerId = ownerId;
    public int OwnerId { get; }
}
