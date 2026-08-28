import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { colors, radius, spacing } from "@/lib/theme";
import { formatDateTime, fullName } from "@/lib/format";
import { POSITIONS, ROLES, type MyProfile, type RosterEntry } from "@/lib/types";

export default function ProfileScreen() {
    const { session, clubGet, logout } = useAuth();
    const [profile, setProfile] = useState<MyProfile>();
    const [roster, setRoster] = useState<RosterEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const me = await clubGet<MyProfile>("/api/vh/client/me");
        setProfile(me);

        // Team-mates are only meaningful once the account is linked to a player on a squad.
        if (me?.player?.teamid) {
            setRoster(await clubGet<RosterEntry[]>(`/api/vh/client/teams/${me.player.teamid}/roster`) ?? []);
        } else {
            setRoster([]);
        }
        setLoading(false);
    }, [clubGet]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    const player = profile?.player;

    return (
        <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg }}>
            <View style={styles.card}>
                <Text style={styles.name}>{session?.name ?? session?.phone}</Text>
                <Text style={styles.meta}>{session?.phone}</Text>
                <Text style={styles.meta}>
                    {session?.tenantname} · {ROLES[profile?.role ?? session?.role ?? ""] ?? profile?.role}
                </Text>
            </View>

            {player ? (
                <View style={styles.card}>
                    <Text style={styles.section}>Тамирчны мэдээлэл</Text>
                    <Row label="Нэр" value={fullName(player.last_name, player.first_name)} />
                    <Row label="Баг" value={player.teamname ?? "-"} />
                    <Row label="Дугаар" value={player.jersey_no ? String(player.jersey_no) : "-"} />
                    <Row label="Байрлал" value={player.position ? POSITIONS[player.position] : "-"} />
                    <Row label="Өндөр" value={player.height_cm ? `${player.height_cm} см` : "-"} />
                    {player.is_captain && <Row label="Үүрэг" value="Багийн ахлагч" />}
                </View>
            ) : (
                <View style={styles.card}>
                    <Text style={styles.meta}>
                        Таны бүртгэл тамирчны картад холбогдоогүй байна. Клубын админд хандана уу.
                    </Text>
                </View>
            )}

            {profile && profile.next_matches.length > 0 && (
                <View style={styles.card}>
                    <Text style={styles.section}>Миний дараагийн тоглолт</Text>
                    {profile.next_matches.map((match) => (
                        <Pressable
                            key={match.matchid}
                            style={styles.matchRow}
                            onPress={() => router.push(`/match/${match.matchid}`)}
                        >
                            <Text style={styles.matchTeams}>{match.hometeamname} — {match.awayteamname}</Text>
                            <Text style={styles.meta}>{formatDateTime(match.scheduled_at)}</Text>
                        </Pressable>
                    ))}
                </View>
            )}

            {roster.length > 0 && (
                <View style={styles.card}>
                    <Text style={styles.section}>Багийн бүрэлдэхүүн</Text>
                    {roster.map((mate) => (
                        <View key={mate.teamplayerid} style={styles.mateRow}>
                            <Text style={styles.mateNumber}>{mate.jersey_no ?? "-"}</Text>
                            <Text style={styles.mateName}>
                                {fullName(mate.last_name, mate.first_name)}
                                {mate.is_captain ? " (ахлагч)" : ""}
                            </Text>
                            <Text style={styles.meta}>{mate.position ? POSITIONS[mate.position] : ""}</Text>
                        </View>
                    ))}
                </View>
            )}

            <Pressable style={styles.secondaryButton} onPress={() => router.push("/club")}>
                <Text style={styles.secondaryText}>Клуб солих</Text>
            </Pressable>

            <Pressable
                style={styles.logoutButton}
                onPress={async () => { await logout(); router.replace("/login"); }}
            >
                <Text style={styles.logoutText}>Гарах</Text>
            </Pressable>
        </ScrollView>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md },
    name: { fontSize: 20, fontWeight: "800", color: colors.text },
    meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    section: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
    row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
    rowLabel: { color: colors.textMuted },
    rowValue: { color: colors.text, fontWeight: "600" },
    matchRow: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
    matchTeams: { color: colors.text, fontWeight: "600" },
    mateRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, gap: spacing.md },
    mateNumber: { width: 28, color: colors.primary, fontWeight: "800" },
    mateName: { flex: 1, color: colors.text },
    secondaryButton: {
        borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm,
        paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.sm,
    },
    secondaryText: { color: colors.primary, fontWeight: "700" },
    logoutButton: { paddingVertical: spacing.lg, alignItems: "center" },
    logoutText: { color: colors.danger, fontWeight: "600" },
});
