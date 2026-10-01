namespace volleyhub_api.Model;

// Every coach's data lives in one shared schema. Each row carries the account that owns it, and
// VolleyDbContext filters every query by the signed-in coach and stamps new rows - so services
// never filter by owner themselves and one coach can never read or change another's rows.
public interface IOwned
{
    int ownerid { get; set; }
}
