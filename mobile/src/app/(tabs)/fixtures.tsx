import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { colors, radius, spacing } from "@/lib/theme";
import { formatDateTime } from "@/lib/format";
import { MATCH_STATUS, type Match } from "@/lib/types";

type Mode = "fixtures" | "results";

export default function FixturesScreen() {
    const { clubGet } = useAuth();
    const [mode, setMode] = useState<Mode>("fixtures");
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        const path = mode === "fixtures" ? "/api/vh/client/fixtures" : "/api/vh/client/results";
        setMatches(await clubGet<Match[]>(path) ?? []);
        setLoading(false);
    }, [clubGet, mode]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    return (
        <View style={styles.screen}>
            <View style={styles.tabs}>
                {(["fixtures", "results"] as Mode[]).map((value) => (
                    <Pressable
                        key={value}
                        style={[styles.tab, mode === value && styles.tabActive]}
                        onPress={() => setMode(value)}
                    >
                        <Text style={[styles.tabText, mode === value && styles.tabTextActive]}>
                            {value === "fixtures" ? "Хуваарь" : "Үр дүн"}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
            ) : (
                <FlatList
                    contentContainerStyle={{ padding: spacing.lg }}
                    data={matches}
                    keyExtractor={(item) => String(item.matchid)}
                    ListEmptyComponent={<Text style={styles.empty}>Тоглолт алга</Text>}
                    renderItem={({ item }) => (
                        <Pressable style={styles.card} onPress={() => router.push(`/match/${item.matchid}`)}>
                            <Text style={styles.meta}>
                                {item.tournamentname}{item.round ? ` · ${item.round}` : ""}
                            </Text>
                            <View style={styles.row}>
                                <Text style={styles.teams}>{item.hometeamname} — {item.awayteamname}</Text>
                                {item.status === 3 ? (
                                    <Text style={styles.score}>{item.home_sets}:{item.away_sets}</Text>
                                ) : (
                                    <Text style={styles.status}>{MATCH_STATUS[item.status]}</Text>
                                )}
                            </View>
                            <Text style={styles.meta}>
                                {formatDateTime(item.scheduled_at)}
                                {item.venuename ? ` · ${item.venuename}` : ""}
                            </Text>
                        </Pressable>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    tabs: {
        flexDirection: "row", backgroundColor: colors.card,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    tab: { flex: 1, paddingVertical: spacing.md, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
    tabActive: { borderBottomColor: colors.primary },
    tabText: { color: colors.textMuted, fontWeight: "600" },
    tabTextActive: { color: colors.primary },
    card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm },
    row: { flexDirection: "row", alignItems: "center", marginVertical: 4 },
    teams: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
    score: { fontSize: 17, fontWeight: "800", color: colors.primary, marginLeft: spacing.md },
    status: { fontSize: 12, color: colors.textMuted, marginLeft: spacing.md },
    meta: { color: colors.textMuted, fontSize: 13 },
    empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
});
