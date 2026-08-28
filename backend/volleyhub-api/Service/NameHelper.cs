namespace volleyhub_api.Service;

public static class NameHelper
{
    // Mongolian names are written "Овог Нэр". A single word is taken as the given name, which is
    // what people type when they only enter one.
    public static (string? lastname, string? firstname) SplitFullName(string? full)
    {
        var value = (full ?? string.Empty).Trim();
        if (value.Length == 0) return (null, null);

        var space = value.IndexOf(' ');
        if (space < 0) return (null, value);

        return (value[..space].Trim(), value[(space + 1)..].Trim());
    }

    public static string? JoinFullName(string? lastname, string? firstname)
    {
        var parts = new[] { lastname, firstname }
            .Where(p => !string.IsNullOrWhiteSpace(p))
            .Select(p => p!.Trim());
        var joined = string.Join(" ", parts);
        return joined.Length == 0 ? null : joined;
    }
}
