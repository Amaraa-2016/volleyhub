import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { colors, radius, spacing } from "@/lib/theme";
import { formatDateTime } from "@/lib/format";
import type { Announcement, Club, Match } from "@/lib/types";

// Club home: the next fixtures, the latest results, and whatever the club has published.
export default function HomeScreen() {
    const { session, clubGet } = useAuth();
    const [club, setClub] = useState<Club>();
    const [fixtures, setFixtures] = useState<Match[]>([]);
    const [results, setResults] = useState<Match[]>([]);
    const [news, setNews] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        const [c, f, r, n] = await Promise.all([
            clubGet<Club>("/api/vh/client/club"),
            clubGet<Match[]>("/api/vh/client/fixtures"),
            clubGet<Match[]>("/api/vh/client/results"),
            clubGet<Announcement[]>("/api/vh/client/announcements"),
        ]);
        setClub(c);
        setFixtures((f ?? []).slice(0, 3));
        setResults((r ?? []).slice(0, 3));
        setNews((n ?? []).slice(0, 5));
        setLoading(false);
        setRefreshing(false);
    }, [clubGet]);

    // Refetch whenever the tab regains focus - a result entered in the backoffice should show up
    // without restarting the app.
    useFocusEffect(useCallback(() => { load(); }, [load]));

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.screen}
            contentContainerStyle={{ padding: spacing.lg }}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => { setRefreshing(true); load(); }}
                    tintColor={colors.primary}
                />
            }
        >
            <Text style={styles.club}>{club?.tenantname ?? session?.tenantname}</Text>
            {!!club?.address && <Text style={styles.clubMeta}>{club.address}</Text>}

            <Text style={styles.section}>Дараагийн тоглолт</Text>
            {fixtures.length === 0 && <Text style={styles.empty}>Товлогдсон тоглолт алга</Text>}
            {fixtures.map((match) => (
                <Pressable
                    key={match.matchid}
                    style={styles.card}
                    onPress={() => router.push(`/match/${match.matchid}`)}
                >
                    <Text style={styles.matchTeams}>{match.hometeamname} — {match.awayteamname}</Text>
                    <Text style={styles.matchMeta}>
                        {formatDateTime(match.scheduled_at)}
                        {match.venuename ? ` · ${match.venuename}` : ""}
                    </Text>
                </Pressable>
            ))}

            <Text style={styles.section}>Сүүлийн үр дүн</Text>
            {results.length === 0 && <Text style={styles.empty}>Үр дүн алга</Text>}
            {results.map((match) => (
                <Pressable
                    key={match.matchid}
                    style={styles.card}
                    onPress={() => router.push(`/match/${match.matchid}`)}
                >
                    <View style={styles.resultRow}>
                        <Text style={styles.matchTeams}>{match.hometeamname} — {match.awayteamname}</Text>
                        <Text style={styles.score}>{match.home_sets}:{match.away_sets}</Text>
                    </View>
                    <Text style={styles.matchMeta}>{formatDateTime(match.scheduled_at)}</Text>
                </Pressable>
            ))}

            {news.length > 0 && (
                <>
                    <Text style={styles.section}>Мэдээ</Text>
                    {news.map((post) => (
                        <View key={post.announcementid} style={styles.card}>
                            <Text style={styles.newsTitle}>{post.title}</Text>
                            {!!post.body && <Text style={styles.newsBody} numberOfLines={4}>{post.body}</Text>}
                            <Text style={styles.matchMeta}>
                                {post.published_at ? formatDateTime(post.published_at) : ""}
                            </Text>
                        </View>
                    ))}
                </>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    club: { fontSize: 22, fontWeight: "800", color: colors.text },
    clubMeta: { color: colors.textMuted, marginTop: 2 },
    section: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xl, marginBottom: spacing.sm },
    card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm },
    matchTeams: { fontSize: 15, fontWeight: "600", color: colors.text, flex: 1 },
    matchMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
    resultRow: { flexDirection: "row", alignItems: "center" },
    score: { fontSize: 17, fontWeight: "800", color: colors.primary, marginLeft: spacing.md },
    newsTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    newsBody: { color: colors.text, marginTop: spacing.xs, lineHeight: 20 },
    empty: { color: colors.textMuted },
});
