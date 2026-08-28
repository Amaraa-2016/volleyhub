using volleyhub_api.Data;
using volleyhub_api.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace volleyhub_api.Controllers;

// What the mobile app reads. Open to every active member of the club (player, coach, fan), so it
// carries no role gate - but it is read-only, and it never exposes anything the backoffice would
// treat as a draft (unpublished news, matches of a draft tournament).
[Authorize]
[ApiController]
[Route("api/vh/client")]
public class ClientController : ApiControllerBase
{
    private readonly ILogger<ClientController> _logger;
    private readonly ClubService _club;
    private readonly CompetitionService _competition;
    private readonly SharedDbContext _shared;

    protected override ILogger Logger => _logger;

    public ClientController(ILogger<ClientController> logger, ClubService club,
        CompetitionService competition, SharedDbContext shared)
    {
        _logger = logger;
        _club = club;
        _competition = competition;
        _shared = shared;
    }

    [HttpGet("club")]
    public Task<IActionResult> Club() =>
        Run(async () =>
        {
            var tenantId = TenantId();
            var tenant = await _shared.tenant.AsNoTracking().FirstOrDefaultAsync(t => t.tenantid == tenantId)
                ?? throw new InvalidOperationException("club_not_found");
            return new
            {
                tenant.tenantid,
                tenant.tenantname,
                tenant.address,
                tenant.contactphone,
                tenant.logo,
            };
        });

    [HttpGet("teams")]
    public Task<IActionResult> Teams() =>
        Run(async () => await _club.Teams());

    [HttpGet("teams/{id:long}/roster")]
    public Task<IActionResult> Roster(long id) =>
        Run(async () => await _club.Roster(id));

    // Everything still to be played, soonest first.
    [HttpGet("fixtures")]
    public Task<IActionResult> Fixtures([FromQuery] long? teamid) =>
        Run(async () =>
        {
            var matches = await _competition.Matches(null, teamid, null, DateTime.UtcNow, null);
            return matches.Where(m => m.status is 1 or 2).ToList();
        });

    [HttpGet("results")]
    public Task<IActionResult> Results([FromQuery] long? teamid, [FromQuery] long? tournamentid) =>
        Run(async () =>
        {
            var matches = await _competition.Matches(tournamentid, teamid, 3, null, null, includeSets: true);
            return matches.OrderByDescending(m => m.scheduled_at).ToList();
        });

    [HttpGet("matches/{id:long}")]
    public Task<IActionResult> Match(long id) =>
        Run(async () => await _competition.Match(id));

    // Draft tournaments (status 1) are backoffice-only.
    [HttpGet("tournaments")]
    public Task<IActionResult> Tournaments() =>
        Run(async () =>
        {
            var all = await _competition.Tournaments(null, null);
            return all.Where(t => t.status != 1).ToList();
        });

    [HttpGet("tournaments/{id:long}/standings")]
    public Task<IActionResult> Standings(long id) =>
        Run(async () => await _competition.Standings(id));

    [HttpGet("announcements")]
    public Task<IActionResult> Announcements() =>
        Run(async () => await _club.Announcements(publishedOnly: true));

    // The caller's own player card, plus their next fixture. Null when the account is not a player.
    [HttpGet("me")]
    public Task<IActionResult> MyProfile() =>
        Run(async () =>
        {
            var player = await _club.PlayerByAccount(AccountId());
            var upcoming = player?.teamid is long teamId
                ? (await _competition.Matches(null, teamId, null, DateTime.UtcNow, null))
                    .Where(m => m.status is 1 or 2).Take(3).ToList()
                : [];

            return new
            {
                role = Role(),
                player,
                next_matches = upcoming,
            };
        });
}
