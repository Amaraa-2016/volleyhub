namespace volleyhub_api.DTO;

// ---- news -----------------------------------------------------------------

public class NewsBT
{
    public long newsid { get; set; }
    public string title { get; set; } = string.Empty;
    public string? summary { get; set; }
    public string? body { get; set; }
    public string? cover { get; set; }
    public short category { get; set; } = 2;
    public string? source { get; set; }
    public string? source_url { get; set; }
    public bool publish { get; set; }
}

public class NewsRT
{
    public long newsid { get; set; }
    public string title { get; set; } = string.Empty;
    public string? summary { get; set; }
    // Only filled on the detail endpoint; the listing leaves it null to keep responses small.
    public string? body { get; set; }
    public string? cover { get; set; }
    public short category { get; set; }
    public string? source { get; set; }
    public string? source_url { get; set; }
    public DateTime? published_at { get; set; }
    public int view_count { get; set; }
    public DateTime created { get; set; }
}

// ---- shop -----------------------------------------------------------------

public class ProductBT
{
    public long productid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? category { get; set; }
    public string? brand { get; set; }
    public string? description { get; set; }
    public decimal price { get; set; }
    public decimal? old_price { get; set; }
    public string? images { get; set; }
    public int stock { get; set; }
    public bool isactive { get; set; } = true;
    public int sort_order { get; set; }
}

public class ProductRT
{
    public long productid { get; set; }
    public string name { get; set; } = string.Empty;
    public string? category { get; set; }
    public string? brand { get; set; }
    public string? description { get; set; }
    public decimal price { get; set; }
    public decimal? old_price { get; set; }
    public List<string> images { get; set; } = new();
    public int stock { get; set; }
    public bool isactive { get; set; }
    public int sort_order { get; set; }
}

public class OrderItemBT
{
    public long productid { get; set; }
    public int quantity { get; set; } = 1;
}

// Placing an enquiry. Prices are never taken from the client: the server reads today's price for
// each product and computes the total itself.
public class OrderBT
{
    public string customer_name { get; set; } = string.Empty;
    public string phone { get; set; } = string.Empty;
    public string? address { get; set; }
    public string? note { get; set; }
    public List<OrderItemBT> items { get; set; } = new();
}

public class OrderItemRT
{
    public long orderitemid { get; set; }
    public long productid { get; set; }
    public string product_name { get; set; } = string.Empty;
    public decimal price { get; set; }
    public int quantity { get; set; }
}

public class OrderRT
{
    public long orderid { get; set; }
    public int accountid { get; set; }
    public string customer_name { get; set; } = string.Empty;
    public string phone { get; set; } = string.Empty;
    public string? address { get; set; }
    public string? note { get; set; }
    public decimal total { get; set; }
    public short status { get; set; }
    public string? admin_note { get; set; }
    public DateTime created { get; set; }
    public List<OrderItemRT> items { get; set; } = new();
}

public class OrderStatusBT
{
    public short status { get; set; }
    public string? admin_note { get; set; }
}

// ---- public course directory ----------------------------------------------

// One course as the public site lists it. The listing is of COURSES, not of organisations: a
// visitor is choosing something to attend at a place, price and time, and one centre may run
// several very different courses. `tenantid` + `groupid` together identify it, since group ids are
// only unique inside a centre's own schema.
public class CourseCardRT
{
    public int tenantid { get; set; }
    public long groupid { get; set; }
    // Who runs it, shown as a subtitle.
    public string tenantname { get; set; } = string.Empty;
    public string name { get; set; } = string.Empty;
    public string? cover { get; set; }
    public string? level { get; set; }
    public string? agegroup { get; set; }
    public short gender { get; set; }
    public decimal fee_amount { get; set; }
    public int capacity { get; set; }
    public int enrolled { get; set; }
    public DateTime? start_date { get; set; }
    public string? address { get; set; }
    public string? phone { get; set; }
    public List<PublicScheduleRT> schedule { get; set; } = new();
}

// The detail page adds what does not belong on a card.
public class CourseDetailRT : CourseCardRT
{
    public string? notes { get; set; }
    public string? map_url { get; set; }
    public string? venuename { get; set; }
    public string? coachname { get; set; }
    public string? tenantphone { get; set; }
    public string? tenantlogo { get; set; }
}

public class PublicScheduleRT
{
    public short weekday { get; set; }
    public int start_minute { get; set; }
    public int end_minute { get; set; }
}

// What a training centre edits about its own public listing.
public class TrainingProfileBT
{
    public string? tagline { get; set; }
    public string? description { get; set; }
    public string? logo { get; set; }
    public string? cover { get; set; }
    public string? photos { get; set; }
    public string? address { get; set; }
    public string? city { get; set; }
    public string? district { get; set; }
    public string? contactphone { get; set; }
    public string? email { get; set; }
    public string? website { get; set; }
    public string? facebook { get; set; }
    public string? instagram { get; set; }
    public decimal? price_from { get; set; }
    public int? age_from { get; set; }
    public int? age_to { get; set; }
    public double? latitude { get; set; }
    public double? longitude { get; set; }
    public bool is_published { get; set; }
}
