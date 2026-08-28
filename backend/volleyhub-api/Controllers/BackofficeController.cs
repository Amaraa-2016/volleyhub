using volleyhub_api.DTO;
using volleyhub_api.Service;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace volleyhub_api.Controllers;

// Club management for the admin web app. Every endpoint is per-club: the tenantid header selects
// the schema and the tenant provider checks the caller is a member of it, so nothing here filters
// by tenant itself. The role gate below is the second half of that - membership alone must not let
// a player edit the squad.
[Authorize]
[ApiController]
[Route("api/vh/backoffice")]
public class BackofficeController : ApiControllerBase
{
    private readonly ILogger<BackofficeController> _logger;
    private readonly ClubService _club;
    private readonly CompetitionService _competition;
    private readonly AccountService _account;

    protected override ILogger Logger => _logger;

    private static readonly string[] ManageRoles = ["owner", "admin"];
    private static readonly string[] StaffRoles = ["owner", "admin", "coach"];

    public BackofficeController(ILogger<BackofficeController> logger, ClubService club,
        CompetitionService competition, AccountService account)
    {
        _logger = logger;
        _club = club;
        _competition = competition;
        _account = account;
    }

    // A coach may read everything and enter results; changing the club itself needs owner/admin.
    private void AssertStaff()
    {
        if (!StaffRoles.Contains(Role()))
            throw new UnauthorizedAccessException("staff_only");
    }

    private void AssertManager()
    {
        if (!ManageRoles.Contains(Role()))
            throw new UnauthorizedAccessException("admin_only");
    }

    // ---- dashboard --------------------------------------------------------

    [HttpGet("dashboard")]
    public Task<IActionResult> Dashboard() =>
        Run(async () =>
        {
            AssertStaff();
            var pending = (await _account.Members(TenantId(), "pending")).Count;
            return await _competition.Dashboard(pending);
        });

    // ---- teams ------------------------------------------------------------

    [HttpGet("teams")]
    public Task<IActionResult> Teams([FromQuery] bool includeInactive = false) =>
        Run(async () => { AssertStaff(); return await _club.Teams(includeInactive); });

    [HttpGet("teams/{id:long}")]
    public Task<IActionResult> Team(long id) =>
        Run(async () => { AssertStaff(); return await _club.Team(id); });

    [HttpPost("teams")]
    public Task<IActionResult> SaveTeam([FromBody] TeamBT data) =>
        Run(async () => { AssertManager(); return await _club.SaveTeam(data); });

    [HttpDelete("teams/{id:long}")]
    public Task<IActionResult> DeleteTeam(long id) =>
        Run(async () => { AssertManager(); return await _club.DeleteTeam(id); });

    // ---- roster -----------------------------------------------------------

    [HttpGet("teams/{id:long}/roster")]
    public Task<IActionResult> Roster(long id) =>
        Run(async () => { AssertStaff(); return await _club.Roster(id); });

    [HttpPost("teams/{id:long}/roster")]
    public Task<IActionResult> AddToRoster(long id, [FromBody] RosterEntryBT data) =>
        Run(async () => { AssertStaff(); return await _club.AddToRoster(id, data); });

    [HttpDelete("teams/{id:long}/roster/{playerId:long}")]
    public Task<IActionResult> RemoveFromRoster(long id, long playerId) =>
        Run(async () => { AssertStaff(); return await _club.RemoveFromRoster(id, playerId); });

    // ---- players ----------------------------------------------------------

    [HttpGet("players")]
    public Task<IActionResult> Players([FromQuery] long? teamid, [FromQuery] string? search,
        [FromQuery] bool unassigned = false) =>
        Run(async () => { AssertStaff(); return await _club.Players(teamid, search, unassigned); });

    [HttpGet("players/{id:long}")]
    public Task<IActionResult> Player(long id) =>
        Run(async () => { AssertStaff(); return await _club.Player(id); });

    [HttpPost("players")]
    public Task<IActionResult> SavePlayer([FromBody] PlayerBT data) =>
        Run(async () => { AssertStaff(); return await _club.SavePlayer(data); });

    [HttpDelete("players/{id:long}")]
    public Task<IActionResult> DeletePlayer(long id) =>
        Run(async () => { AssertManager(); return await _club.DeletePlayer(id); });

    // ---- venues -----------------------------------------------------------

    [HttpGet("venues")]
    public Task<IActionResult> Venues() =>
        Run(async () => { AssertStaff(); return await _club.Venues(); });

    [HttpPost("venues")]
    public Task<IActionResult> SaveVenue([FromBody] VenueBT data) =>
        Run(async () => { AssertManager(); return await _club.SaveVenue(data); });

    [HttpDelete("venues/{id:long}")]
    public Task<IActionResult> DeleteVenue(long id) =>
        Run(async () => { AssertManager(); return await _club.DeleteVenue(id); });

    // ---- seasons ----------------------------------------------------------

    [HttpGet("seasons")]
    public Task<IActionResult> Seasons() =>
        Run(async () => { AssertStaff(); return await _competition.Seasons(); });

    [HttpPost("seasons")]
    public Task<IActionResult> SaveSeason([FromBody] SeasonBT data) =>
        Run(async () => { AssertManager(); return await _competition.SaveSeason(data); });

    [HttpDelete("seasons/{id:long}")]
    public Task<IActionResult> DeleteSeason(long id) =>
        Run(async () => { AssertManager(); return await _competition.DeleteSeason(id); });

    // ---- tournaments ------------------------------------------------------

    [HttpGet("tournaments")]
    public Task<IActionResult> Tournaments([FromQuery] long? seasonid, [FromQuery] short? status) =>
        Run(async () => { AssertStaff(); return await _competition.Tournaments(seasonid, status); });

    [HttpGet("tournaments/{id:long}")]
    public Task<IActionResult> Tournament(long id) =>
        Run(async () => { AssertStaff(); return await _competition.Tournament(id); });

    [HttpPost("tournaments")]
    public Task<IActionResult> SaveTournament([FromBody] TournamentBT data) =>
        Run(async () => { AssertManager(); return await _competition.SaveTournament(data); });

    [HttpDelete("tournaments/{id:long}")]
    public Task<IActionResult> DeleteTournament(long id) =>
        Run(async () => { AssertManager(); return await _competition.DeleteTournament(id); });

    [HttpGet("tournaments/{id:long}/teams")]
    public Task<IActionResult> TournamentTeams(long id) =>
        Run(async () => { AssertStaff(); return await _competition.TournamentTeams(id); });

    [HttpPost("tournaments/{id:long}/teams")]
    public Task<IActionResult> AddTournamentTeam(long id, [FromBody] TournamentTeamBT data) =>
        Run(async () => { AssertManager(); return await _competition.AddTournamentTeam(id, data); });

    [HttpDelete("tournaments/{id:long}/teams/{teamId:long}")]
    public Task<IActionResult> RemoveTournamentTeam(long id, long teamId) =>
        Run(async () => { AssertManager(); return await _competition.RemoveTournamentTeam(id, teamId); });

    [HttpPost("tournaments/{id:long}/fixtures")]
    public Task<IActionResult> GenerateFixtures(long id) =>
        Run(async () => { AssertManager(); return await _competition.GenerateFixtures(id); });

    [HttpGet("tournaments/{id:long}/standings")]
    public Task<IActionResult> Standings(long id) =>
        Run(async () => { AssertStaff(); return await _competition.Standings(id); });

    // ---- matches ----------------------------------------------------------

    [HttpGet("matches")]
    public Task<IActionResult> Matches([FromQuery] long? tournamentid, [FromQuery] long? teamid,
        [FromQuery] short? status, [FromQuery] DateTime? from, [FromQuery] DateTime? to) =>
        Run(async () => { AssertStaff(); return await _competition.Matches(tournamentid, teamid, status, from, to); });

    [HttpGet("matches/{id:long}")]
    public Task<IActionResult> Match(long id) =>
        Run(async () => { AssertStaff(); return await _competition.Match(id); });

    [HttpPost("matches")]
    public Task<IActionResult> SaveMatch([FromBody] MatchBT data) =>
        Run(async () => { AssertStaff(); return await _competition.SaveMatch(data); });

    [HttpPost("matches/{id:long}/result")]
    public Task<IActionResult> SaveResult(long id, [FromBody] MatchResultBT data) =>
        Run(async () => { AssertStaff(); return await _competition.SaveResult(id, data); });

    [HttpDelete("matches/{id:long}")]
    public Task<IActionResult> DeleteMatch(long id) =>
        Run(async () => { AssertManager(); return await _competition.DeleteMatch(id); });

    // ---- announcements ----------------------------------------------------

    [HttpGet("announcements")]
    public Task<IActionResult> Announcements() =>
        Run(async () => { AssertStaff(); return await _club.Announcements(publishedOnly: false); });

    [HttpPost("announcements")]
    public Task<IActionResult> SaveAnnouncement([FromBody] AnnouncementBT data) =>
        Run(async () => { AssertStaff(); return await _club.SaveAnnouncement(data, StaffId()); });

    [HttpDelete("announcements/{id:long}")]
    public Task<IActionResult> DeleteAnnouncement(long id) =>
        Run(async () => { AssertManager(); return await _club.DeleteAnnouncement(id); });

    // ---- people -----------------------------------------------------------

    [HttpGet("staff")]
    public Task<IActionResult> Staff() =>
        Run(async () => { AssertStaff(); return await _club.Staff(); });

    [HttpGet("members")]
    public Task<IActionResult> Members([FromQuery] string? status) =>
        Run(async () => { AssertManager(); return await _account.Members(TenantId(), status); });

    [HttpPost("members/{id:int}/approve")]
    public Task<IActionResult> ApproveMember(int id, [FromBody] MemberActionBT? data) =>
        Run(async () => { AssertManager(); return await _account.ApproveMember(TenantId(), id, data ?? new MemberActionBT()); });

    [HttpPost("members/{id:int}/role")]
    public Task<IActionResult> SetMemberRole(int id, [FromBody] MemberActionBT data) =>
        Run(async () => { AssertManager(); return await _account.SetMemberRole(TenantId(), id, data); });

    [HttpDelete("members/{id:int}")]
    public Task<IActionResult> RemoveMember(int id) =>
        Run(async () => { AssertManager(); return await _account.RemoveMember(TenantId(), id); });
}
