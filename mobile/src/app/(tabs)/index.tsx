import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { request } from "@/lib/api";
import { colors, radius, spacing } from "@/lib/theme";
import { formatDateTime } from "@/lib/format";
import { minuteToTime, type Announcement, type MyProfile, type News, type Training } from "@/lib/types";

// The student's home: which centre they attend, what is next, and what has been posted.
export default function HomeScreen() {
    const { session, clubGet } = useAuth();
    const [training, setTraining] = useState<Training>();
    const [profile, setProfile] = useState<MyProfile>();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [news, setNews] = useState<News[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const load = useCallback(async () => {
        const [t, me, posts] = await Promise.all([
            clubGet<Training>("/api/vh/client/club"),
            clubGet<MyProfile>("/api/vh/client/me"),
            clubGet<Announcement[]>("/api/vh/client/announcements"),
        ]);
        setTraining(t);
        setProfile(me);
        setAnnouncements((posts ?? []).slice(0, 5));

        // Platform news is public, so it needs no club token - it is the same feed the website shows.
        const platformNews = await request<News[]>("/api/vh/public/news?take=5");
        setNews(platformNews.data ?? []);

        setLoading(false);
        setRefreshing(false);
    }, [clubGet]);

    // Refetch on focus: a session or announcement added in the console should appear without a
    // restart.
    useFocusEffect(useCallback(() => { load(); }, [load]));

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    const next = profile?.next_sessions ?? [];

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
            <Text style={styles.club}>{training?.tenantname ?? session?.tenantname}</Text>
            {!!training?.tagline && <Text style={styles.clubMeta}>{training.tagline}</Text>}
            {!!profile?.student?.groupname && (
                <Text style={styles.clubMeta}>Групп: {profile.student.groupname}</Text>
            )}

            {(profile?.student?.balance ?? 0) > 0 && (
                <View style={styles.alert}>
                    <Text style={styles.alertText}>
                        Төлбөрийн үлдэгдэл: {Math.round(profile!.student!.balance).toLocaleString("mn-MN")}₮
                    </Text>
                </View>
            )}

            <Text style={styles.section}>Дараагийн хичээл</Text>
            {next.length === 0 ? (
                <Text style={styles.empty}>Товлогдсон хичээл алга</Text>
            ) : next.map((s) => (
                <View key={s.sessionid} style={styles.card}>
                    <Text style={styles.cardTitle}>{s.groupname}</Text>
                    <Text style={styles.cardMeta}>
                        {formatDateTime(s.session_date).slice(0, 10)} · {minuteToTime(s.start_minute)}-{minuteToTime(s.end_minute)}
                    </Text>
                    {!!s.venuename && <Text style={styles.cardMeta}>{s.venuename}</Text>}
                </View>
            ))}

            {announcements.length > 0 && (
                <>
                    <Text style={styles.section}>Сургалтын зарлага</Text>
                    {announcements.map((post) => (
                        <View key={post.announcementid} style={styles.card}>
                            <Text style={styles.cardTitle}>{post.title}</Text>
                            {!!post.body && <Text style={styles.body} numberOfLines={4}>{post.body}</Text>}
                            {!!post.published_at && (
                                <Text style={styles.cardMeta}>{formatDateTime(post.published_at)}</Text>
                            )}
                        </View>
                    ))}
                </>
            )}

            {news.length > 0 && (
                <>
                    <Text style={styles.section}>Волейболын мэдээ</Text>
                    {news.map((n) => (
                        <View key={n.newsid} style={styles.card}>
                            <Text style={styles.cardTitle}>{n.title}</Text>
                            {!!n.summary && <Text style={styles.body} numberOfLines={3}>{n.summary}</Text>}
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
    alert: {
        backgroundColor: "#FDECEA", borderRadius: radius.sm, padding: spacing.md, marginTop: spacing.lg,
    },
    alertText: { color: colors.danger, fontWeight: "700" },
    section: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xl, marginBottom: spacing.sm },
    card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
    cardMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
    body: { color: colors.text, marginTop: spacing.xs, lineHeight: 20 },
    empty: { color: colors.textMuted },
});
