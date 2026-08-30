using volleyhub_api.Data;
using volleyhub_api.DTO;
using volleyhub_api.Model;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Service;

// The platform's own content: volleyball news and the shop. All of it lives in the public schema
// and is written by platform admins - deliberately not per-training-centre data, which is why this
// service never touches a tenant schema.
public class PlatformContentService
{
    private readonly AccountDbContext _db;

    public PlatformContentService(AccountDbContext db)
    {
        _db = db;
    }

    private static string Norm(string? s) => (s ?? string.Empty).Trim();
    private static string? NullIfEmpty(string? s) => Norm(s) is { Length: > 0 } v ? v : null;

    // Images are stored as one comma-separated string: they are only ever read as an ordered set
    // for a single row, so a join table would buy nothing.
    private static List<string> SplitImages(string? images) =>
        (images ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

    // ---- news -------------------------------------------------------------

    public async Task<List<NewsRT>> News(short? category, bool publishedOnly, int take = 50)
    {
        var query = _db.news_post.AsNoTracking().Where(n => !n.is_deleted);
        if (publishedOnly) query = query.Where(n => n.published_at != null && n.published_at <= DateTime.UtcNow);
        if (category is short c) query = query.Where(n => n.category == c);

        var rows = await query
            .OrderByDescending(n => n.published_at ?? n.created)
            .Take(take)
            .ToListAsync();

        // The listing leaves the body out on purpose: it is the biggest column and no card shows it.
        return rows.Select(n => ToNewsRT(n, includeBody: false)).ToList();
    }

    public async Task<NewsRT> NewsItem(long newsId, bool publishedOnly)
    {
        var post = await _db.news_post.FirstOrDefaultAsync(n => n.newsid == newsId && !n.is_deleted)
            ?? throw new InvalidOperationException("news_not_found");
        if (publishedOnly && (post.published_at == null || post.published_at > DateTime.UtcNow))
            throw new InvalidOperationException("news_not_found");

        if (publishedOnly)
        {
            // Counting a read is not worth failing the request over, and it must not change `updated`.
            post.view_count++;
            await _db.SaveChangesAsync();
        }

        return ToNewsRT(post, includeBody: true);
    }

    public async Task<object> SaveNews(NewsBT data, int accountId)
    {
        if (Norm(data.title).Length == 0) throw new ArgumentException("title_required");

        var now = DateTime.UtcNow;
        NewsPost post;
        if (data.newsid > 0)
        {
            post = await _db.news_post.FirstOrDefaultAsync(n => n.newsid == data.newsid && !n.is_deleted)
                ?? throw new InvalidOperationException("news_not_found");
        }
        else
        {
            post = new NewsPost { created = now, author_accountid = accountId };
            _db.news_post.Add(post);
        }

        post.title = Norm(data.title);
        post.summary = NullIfEmpty(data.summary);
        post.body = data.body;
        post.cover = NullIfEmpty(data.cover);
        post.category = data.category;
        post.source = NullIfEmpty(data.source);
        post.source_url = NullIfEmpty(data.source_url);
        // Publishing stamps the time once; unpublishing clears it, so a re-publish reads as new.
        post.published_at = data.publish ? post.published_at ?? now : null;
        post.updated = now;

        await _db.SaveChangesAsync();
        return new { post.newsid };
    }

    public async Task<object> DeleteNews(long newsId)
    {
        var post = await _db.news_post.FirstOrDefaultAsync(n => n.newsid == newsId && !n.is_deleted)
            ?? throw new InvalidOperationException("news_not_found");

        post.is_deleted = true;
        post.updated = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    private static NewsRT ToNewsRT(NewsPost n, bool includeBody) => new()
    {
        newsid = n.newsid,
        title = n.title,
        summary = n.summary,
        body = includeBody ? n.body : null,
        cover = n.cover,
        category = n.category,
        source = n.source,
        source_url = n.source_url,
        published_at = n.published_at,
        view_count = n.view_count,
        created = n.created,
    };

    // ---- shop -------------------------------------------------------------

    public async Task<List<ProductRT>> Products(string? category, string? search, bool activeOnly)
    {
        var query = _db.product.AsNoTracking().Where(p => !p.is_deleted);
        if (activeOnly) query = query.Where(p => p.isactive);
        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(p => p.category == category);

        var term = Norm(search).ToLowerInvariant();
        if (term.Length > 0)
            query = query.Where(p => p.name.ToLower().Contains(term)
                || (p.brand != null && p.brand.ToLower().Contains(term)));

        var rows = await query.OrderBy(p => p.sort_order).ThenBy(p => p.name).ToListAsync();
        return rows.Select(ToProductRT).ToList();
    }

    public async Task<ProductRT> Product(long productId, bool activeOnly)
    {
        var product = await _db.product.AsNoTracking()
            .FirstOrDefaultAsync(p => p.productid == productId && !p.is_deleted && (!activeOnly || p.isactive))
            ?? throw new InvalidOperationException("product_not_found");
        return ToProductRT(product);
    }

    public async Task<List<string>> ProductCategories()
    {
        return await _db.product.AsNoTracking()
            .Where(p => !p.is_deleted && p.isactive && p.category != null)
            .Select(p => p.category!)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
    }

    public async Task<object> SaveProduct(ProductBT data)
    {
        if (Norm(data.name).Length == 0) throw new ArgumentException("name_required");
        if (data.price < 0) throw new ArgumentException("price_cannot_be_negative");

        var now = DateTime.UtcNow;
        Product product;
        if (data.productid > 0)
        {
            product = await _db.product.FirstOrDefaultAsync(p => p.productid == data.productid && !p.is_deleted)
                ?? throw new InvalidOperationException("product_not_found");
        }
        else
        {
            product = new Product { created = now };
            _db.product.Add(product);
        }

        product.name = Norm(data.name);
        product.category = NullIfEmpty(data.category);
        product.brand = NullIfEmpty(data.brand);
        product.description = data.description;
        product.price = data.price;
        product.old_price = data.old_price;
        product.images = NullIfEmpty(data.images);
        product.stock = data.stock;
        product.isactive = data.isactive;
        product.sort_order = data.sort_order;
        product.updated = now;

        await _db.SaveChangesAsync();
        return new { product.productid };
    }

    public async Task<object> DeleteProduct(long productId)
    {
        var product = await _db.product.FirstOrDefaultAsync(p => p.productid == productId && !p.is_deleted)
            ?? throw new InvalidOperationException("product_not_found");

        product.is_deleted = true;
        product.isactive = false;
        product.updated = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new { ok = true };
    }

    private static ProductRT ToProductRT(Product p) => new()
    {
        productid = p.productid,
        name = p.name,
        category = p.category,
        brand = p.brand,
        description = p.description,
        price = p.price,
        old_price = p.old_price,
        images = SplitImages(p.images),
        stock = p.stock,
        isactive = p.isactive,
        sort_order = p.sort_order,
    };

    // ---- orders -----------------------------------------------------------

    // Placing an enquiry. Prices are read from the database, never taken from the request - the
    // client could otherwise name its own price. Anonymous orders are allowed: the shop is public.
    public async Task<object> PlaceOrder(OrderBT data, int accountId)
    {
        if (Norm(data.customer_name).Length == 0) throw new ArgumentException("name_required");
        if (Norm(data.phone).Length == 0) throw new ArgumentException("phone_required");

        var items = (data.items ?? []).Where(i => i.quantity > 0).ToList();
        if (items.Count == 0) throw new ArgumentException("no_items");
        if (items.Count > 50) throw new ArgumentException("too_many_items");

        var productIds = items.Select(i => i.productid).Distinct().ToList();
        var products = await _db.product.AsNoTracking()
            .Where(p => productIds.Contains(p.productid) && !p.is_deleted && p.isactive)
            .ToDictionaryAsync(p => p.productid, p => p);

        if (products.Count != productIds.Count) throw new InvalidOperationException("product_unavailable");

        var now = DateTime.UtcNow;
        var order = new ProductOrder
        {
            accountid = accountId,
            customer_name = Norm(data.customer_name),
            phone = Norm(data.phone),
            address = NullIfEmpty(data.address),
            note = NullIfEmpty(data.note),
            status = 1,
            created = now,
            updated = now,
        };
        _db.product_order.Add(order);
        await _db.SaveChangesAsync();

        var lines = items.Select(i =>
        {
            var product = products[i.productid];
            return new ProductOrderItem
            {
                orderid = order.orderid,
                productid = product.productid,
                // Copied, not joined: the order must still read correctly after the product is
                // renamed, repriced or withdrawn.
                product_name = product.name,
                price = product.price,
                quantity = i.quantity,
            };
        }).ToList();

        _db.product_order_item.AddRange(lines);
        order.total = lines.Sum(l => l.price * l.quantity);
        await _db.SaveChangesAsync();

        return new { order.orderid, order.total };
    }

    public async Task<List<OrderRT>> Orders(short? status)
    {
        var query = _db.product_order.AsNoTracking().Where(o => !o.is_deleted);
        if (status is short st) query = query.Where(o => o.status == st);

        var orders = await query.OrderByDescending(o => o.created).Take(300).ToListAsync();
        if (orders.Count == 0) return [];

        var ids = orders.Select(o => o.orderid).ToList();
        var items = (await _db.product_order_item.AsNoTracking()
                .Where(i => ids.Contains(i.orderid))
                .ToListAsync())
            .GroupBy(i => i.orderid)
            .ToDictionary(g => g.Key, g => g.Select(i => new OrderItemRT
            {
                orderitemid = i.orderitemid,
                productid = i.productid,
                product_name = i.product_name,
                price = i.price,
                quantity = i.quantity,
            }).ToList());

        return orders.Select(o => new OrderRT
        {
            orderid = o.orderid,
            accountid = o.accountid,
            customer_name = o.customer_name,
            phone = o.phone,
            address = o.address,
            note = o.note,
            total = o.total,
            status = o.status,
            admin_note = o.admin_note,
            created = o.created,
            items = items.TryGetValue(o.orderid, out var list) ? list : [],
        }).ToList();
    }

    public async Task<object> SetOrderStatus(long orderId, OrderStatusBT data)
    {
        if (data.status is < 1 or > 5) throw new ArgumentException("status_out_of_range");

        var order = await _db.product_order.FirstOrDefaultAsync(o => o.orderid == orderId && !o.is_deleted)
            ?? throw new InvalidOperationException("order_not_found");

        order.status = data.status;
        order.admin_note = NullIfEmpty(data.admin_note) ?? order.admin_note;
        order.updated = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return new { order.orderid, order.status };
    }
}
