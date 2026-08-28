import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { colors, radius, spacing } from "@/lib/theme";
import type { Standing, Tournament } from "@/lib/types";

// League table for one tournament. The table itself is computed by the backend from finished
// matches, so this screen only picks which competition to show.
export default function StandingsScreen() {
    const { clubGet } = useAuth();
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [selected, setSelected] = useState<number>();
    const [rows, setRows] = useState<Standing[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(useCallback(() => {
        clubGet<Tournament[]>("/api/vh/client/tournaments").then((list) => {
            setTournaments(list ?? []);
            setSelected((current) => current ?? list?.[0]?.tournamentid);
            setLoading(false);
        });
    }, [clubGet]));

    useEffect(() => {
        if (!selected) return;
        clubGet<Standing[]>(`/api/vh/client/tournaments/${selected}/standings`)
            .then((list) => setRows(list ?? []));
    }, [clubGet, selected]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (tournaments.length === 0) {
        return (
            <View style={styles.center}>
                <Text style={styles.empty}>Тэмцээн алга</Text>
            </View>
        );
    }

    return (
        <View style={styles.screen}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chips}
                contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
            >
                {tournaments.map((t) => (
                    <Pressable
                        key={t.tournamentid}
                        style={[styles.chip, selected === t.tournamentid && styles.chipActive]}
                        onPress={() => setSelected(t.tournamentid)}
                    >
                        <Text style={[styles.chipText, selected === t.tournamentid && styles.chipTextActive]}>
                            {t.name}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>

            <View style={styles.headerRow}>
                <Text style={[styles.headerCell, styles.colPos]}>#</Text>
                <Text style={[styles.headerCell, styles.colTeam]}>Баг</Text>
                <Text style={[styles.headerCell, styles.colNum]}>Тог</Text>
                <Text style={[styles.headerCell, styles.colNum]}>Х</Text>
                <Text style={[styles.headerCell, styles.colNum]}>Я</Text>
                <Text style={[styles.headerCell, styles.colSets]}>Сет</Text>
                <Text style={[styles.headerCell, styles.colNum]}>Очко</Text>
            </View>

            <FlatList
                data={rows}
                keyExtractor={(item) => String(item.teamid)}
                ListEmptyComponent={<Text style={styles.empty}>Дууссан тоглолт алга</Text>}
                renderItem={({ item }) => (
                    <View style={styles.row}>
                        <Text style={[styles.cell, styles.colPos]}>{item.position}</Text>
                        <Text style={[styles.cell, styles.colTeam]} numberOfLines={1}>{item.teamname}</Text>
                        <Text style={[styles.cell, styles.colNum]}>{item.played}</Text>
                        <Text style={[styles.cell, styles.colNum]}>{item.won}</Text>
                        <Text style={[styles.cell, styles.colNum]}>{item.lost}</Text>
                        <Text style={[styles.cell, styles.colSets]}>{item.sets_won}:{item.sets_lost}</Text>
                        <Text style={[styles.cell, styles.colNum, styles.points]}>{item.points}</Text>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    chips: { flexGrow: 0, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
    chip: {
        paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.lg,
        backgroundColor: colors.background, marginRight: spacing.sm,
    },
    chipActive: { backgroundColor: colors.primary },
    chipText: { color: colors.textMuted, fontWeight: "600" },
    chipTextActive: { color: "#fff" },
    headerRow: {
        flexDirection: "row", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
        backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    headerCell: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
    row: {
        flexDirection: "row", paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
        borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card,
    },
    cell: { color: colors.text, fontSize: 14 },
    colPos: { width: 26 },
    colTeam: { flex: 1, paddingRight: spacing.sm },
    colNum: { width: 38, textAlign: "center" },
    colSets: { width: 52, textAlign: "center" },
    points: { fontWeight: "800", color: colors.primary },
    empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
});
