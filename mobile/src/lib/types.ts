// Mirrors the backend DTOs the mobile app consumes. Field names match the JSON exactly.

export interface TenantMembership {
    tenantid: number;
    tenantname: string;
    role: string;
    status: string;
    staffid: number;
    logo?: string | null;
}

export interface SwitchResult {
    tenantid: number;
    tenantname: string;
    role: string;
    staffid: number;
    token: string;
    expirydate: string;
}

export interface AccountLogin {
    accountid: number;
    phone: string;
    name?: string | null;
    lastname?: string | null;
    firstname?: string | null;
    token: string;
    expirydate: string;
    isplatformadmin: boolean;
    tenants: TenantMembership[];
    selected?: SwitchResult | null;
}

export interface Club {
    tenantid: number;
    tenantname: string;
    address?: string | null;
    contactphone?: string | null;
    logo?: string | null;
}

export interface Team {
    teamid: number;
    name: string;
    shortname?: string | null;
    gender: number;
    agegroup?: string | null;
    division?: string | null;
    coachname?: string | null;
    logo?: string | null;
    playercount: number;
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
    status: number;
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
    awayteamid: number;
    awayteamname: string;
    venuename?: string | null;
    scheduled_at: string;
    round?: string | null;
    status: number;
    home_sets: number;
    away_sets: number;
    notes?: string | null;
    sets: MatchSet[];
}

export interface Tournament {
    tournamentid: number;
    name: string;
    seasonname?: string | null;
    format: number;
    gender: number;
    startdate: string;
    enddate: string;
    status: number;
    teamcount: number;
    matchcount: number;
}

export interface Standing {
    position: number;
    teamid: number;
    teamname: string;
    pool?: string | null;
    played: number;
    won: number;
    lost: number;
    sets_won: number;
    sets_lost: number;
    set_ratio: number;
    points: number;
}

export interface Announcement {
    announcementid: number;
    title: string;
    body?: string | null;
    authorname?: string | null;
    published_at?: string | null;
    created: string;
}

export interface PlayerCard {
    playerid: number;
    last_name: string;
    first_name: string;
    position?: number | null;
    height_cm?: number | null;
    jersey_no?: number | null;
    is_captain: boolean;
    teamid?: number | null;
    teamname?: string | null;
    status: number;
}

export interface MyProfile {
    role: string;
    player?: PlayerCard | null;
    next_matches: Match[];
}

export const POSITIONS: Record<number, string> = {
    1: "Довтлогч",
    2: "Диагональ",
    3: "Холбогч",
    4: "Төв довтлогч",
    5: "Либеро",
    6: "Хамгаалагч",
};

export const MATCH_STATUS: Record<number, string> = {
    1: "Товлогдсон",
    2: "Явагдаж буй",
    3: "Дууссан",
    4: "Цуцлагдсан",
    5: "Хойшилсон",
};

export const ROLES: Record<string, string> = {
    owner: "Эзэмшигч",
    admin: "Админ",
    coach: "Дасгалжуулагч",
    player: "Тамирчин",
    fan: "Дэмжигч",
};
