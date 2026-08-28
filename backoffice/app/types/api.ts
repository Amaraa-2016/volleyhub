// Mirrors the backend DTOs. Field names match the JSON exactly, so responses need no mapping.

export interface Team {
    teamid: number;
    name: string;
    shortname?: string | null;
    gender: number;
    agegroup?: string | null;
    division?: string | null;
    coach_staffid?: number | null;
    coachname?: string | null;
    logo?: string | null;
    notes?: string | null;
    isactive: boolean;
    playercount: number;
}

export interface Player {
    playerid: number;
    accountid: number;
    last_name: string;
    first_name: string;
    date_of_birth?: string | null;
    gender?: number | null;
    reg_no?: string | null;
    phone?: string | null;
    position?: number | null;
    height_cm?: number | null;
    reach_cm?: number | null;
    photo?: string | null;
    status: number;
    notes?: string | null;
    teamid?: number | null;
    teamname?: string | null;
    jersey_no?: number | null;
    is_captain: boolean;
}

export interface RosterEntry {
    teamplayerid: number;
    playerid: number;
    last_name: string;
    first_name: string;
    position?: number | null;
    height_cm?: number | null;
    jersey_no?: number | null;
    is_captain: boolean;
    joined: string;
    status: number;
}

export interface Venue {
    venueid: number;
    name: string;
    address?: string | null;
    courts: number;
    contactphone?: string | null;
    notes?: string | null;
}

export interface Season {
    seasonid: number;
    name: string;
    startdate: string;
    enddate: string;
    isactive: boolean;
}

export interface Tournament {
    tournamentid: number;
    seasonid?: number | null;
    seasonname?: string | null;
    name: string;
    format: number;
    gender: number;
    startdate: string;
    enddate: string;
    venueid?: number | null;
    venuename?: string | null;
    status: number;
    best_of: number;
    notes?: string | null;
    teamcount: number;
    matchcount: number;
}

export interface TournamentTeam {
    tournamentteamid: number;
    teamid: number;
    teamname: string;
    logo?: string | null;
    seed?: number | null;
    pool?: string | null;
}

export interface MatchSet {
    set_no: number;
    home_points: number;
    away_points: number;
}

export interface Match {
    matchid: number;
    tournamentid: number;
    tournamentname?: string | null;
    hometeamid: number;
    hometeamname: string;
    homelogo?: string | null;
    awayteamid: number;
    awayteamname: string;
    awaylogo?: string | null;
    venueid?: number | null;
    venuename?: string | null;
    scheduled_at: string;
    round?: string | null;
    status: number;
    home_sets: number;
    away_sets: number;
    notes?: string | null;
    sets: MatchSet[];
}

export interface Standing {
    position: number;
    teamid: number;
    teamname: string;
    logo?: string | null;
    pool?: string | null;
    played: number;
    won: number;
    lost: number;
    sets_won: number;
    sets_lost: number;
    set_ratio: number;
    points_won: number;
    points_lost: number;
    point_ratio: number;
    points: number;
}

export interface Announcement {
    announcementid: number;
    title: string;
    body?: string | null;
    cover?: string | null;
    authorname?: string | null;
    published_at?: string | null;
    created: string;
}

export interface Member {
    accounttenantid: number;
    accountid: number;
    phone: string;
    lastname?: string | null;
    firstname?: string | null;
    role: string;
    status: string;
    staffid: number;
    joined: string;
}

export interface Staff {
    staffid: number;
    staffname?: string | null;
    roleid: number;
    phone: string;
}

export interface Dashboard {
    teams: number;
    players: number;
    tournaments: number;
    upcoming_matches: number;
    pending_members: number;
    next_matches: Match[];
    latest_results: Match[];
}

export interface TenantRequest {
    tenantrequestid: number;
    accountid: number;
    applicantname?: string | null;
    applicantphone?: string | null;
    tenantname: string;
    registernumber?: string | null;
    address?: string | null;
    contactphone?: string | null;
    status: string;
    note?: string | null;
    tenantid?: number | null;
    created: string;
    reviewedat?: string | null;
}

export interface ClubSearchResult {
    tenantid: number;
    tenantname: string;
    address?: string | null;
    logo?: string | null;
}

// ---- shared labels --------------------------------------------------------

export const GENDERS: Record<number, string> = { 1: "Эрэгтэй", 2: "Эмэгтэй", 3: "Холимог" };

export const POSITIONS: Record<number, string> = {
    1: "Довтлогч (outside)",
    2: "Диагональ",
    3: "Холбогч",
    4: "Төв довтлогч",
    5: "Либеро",
    6: "Хамгаалагч",
};

export const PLAYER_STATUS: Record<number, string> = { 1: "Идэвхтэй", 2: "Бэртэлтэй", 3: "Идэвхгүй" };

export const TOURNAMENT_FORMATS: Record<number, string> = { 1: "Лиг", 2: "Шигшээ", 3: "Нөхөрсөг" };

export const TOURNAMENT_STATUS: Record<number, string> = {
    1: "Ноорог", 2: "Нийтлэгдсэн", 3: "Явагдаж буй", 4: "Дууссан", 5: "Цуцлагдсан",
};

export const MATCH_STATUS: Record<number, string> = {
    1: "Товлогдсон", 2: "Явагдаж буй", 3: "Дууссан", 4: "Цуцлагдсан", 5: "Хойшилсон",
};

export const ROLES: Record<string, string> = {
    owner: "Эзэмшигч", admin: "Админ", coach: "Дасгалжуулагч", player: "Тамирчин", fan: "Дэмжигч",
};
