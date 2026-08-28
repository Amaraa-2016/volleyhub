import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/lib/auth";
import { colors, radius, spacing } from "@/lib/theme";
import { formatDateTime } from "@/lib/format";
import { MATCH_STATUS, type Match } from "@/lib/types";

export default function MatchScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { clubGet } = useAuth();
    const [match, setMatch] = useState<Match>();
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setMatch(await clubGet<Match>(`/api/vh/client/matches/${id}`));
        setLoading(false);
    }, [clubGet, id]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (!match) {
        return (
            <View style={styles.center}>
                <Text style={styles.meta}>Тоглолт олдсонгүй</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg }}>
            <View style={styles.card}>
                <Text style={styles.meta}>
                    {match.tournamentname}{match.round ? ` · ${match.round}` : ""}
                </Text>

                <View style={styles.scoreRow}>
                    <Text style={styles.team} numberOfLines={2}>{match.hometeamname}</Text>
                    <Text style={styles.score}>
                        {match.status === 3 ? `${match.home_sets} : ${match.away_sets}` : "vs"}
                    </Text>
                    <Text style={[styles.team, styles.teamRight]} numberOfLines={2}>{match.awayteamname}</Text>
                </View>

                <Text style={styles.meta}>{formatDateTime(match.scheduled_at)}</Text>
                {!!match.venuename && <Text style={styles.meta}>{match.venuename}</Text>}
                <Text style={styles.status}>{MATCH_STATUS[match.status]}</Text>
            </View>

            {match.sets.length > 0 && (
                <View style={styles.card}>
                    <Text style={styles.section}>Сетүүд</Text>
                    {match.sets.map((set) => (
                        <View key={set.set_no} style={styles.setRow}>
                            <Text style={styles.setLabel}>{set.set_no}-р сет</Text>
                            <Text
                                style={[styles.setScore, set.home_points > set.away_points && styles.setWinner]}
                            >
                                {set.home_points}
                            </Text>
                            <Text style={styles.setSeparator}>:</Text>
                            <Text
                                style={[styles.setScore, set.away_points > set.home_points && styles.setWinner]}
                            >
                                {set.away_points}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {!!match.notes && (
                <View style={styles.card}>
                    <Text style={styles.section}>Тэмдэглэл</Text>
                    <Text style={styles.notes}>{match.notes}</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md },
    scoreRow: { flexDirection: "row", alignItems: "center", marginVertical: spacing.lg },
    team: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.text },
    teamRight: { textAlign: "right" },
    score: { fontSize: 24, fontWeight: "800", color: colors.primary, marginHorizontal: spacing.md },
    meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    status: { color: colors.text, marginTop: spacing.sm, fontWeight: "600" },
    section: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
    setRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm },
    setLabel: { flex: 1, color: colors.text },
    setScore: { width: 40, textAlign: "center", fontSize: 16, color: colors.textMuted },
    setWinner: { color: colors.text, fontWeight: "800" },
    setSeparator: { color: colors.textMuted },
    notes: { color: colors.text, lineHeight: 20 },
});
