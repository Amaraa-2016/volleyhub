import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { colors, radius, spacing } from "@/lib/theme";
import { formatDate } from "@/lib/format";
import {
    ATTENDANCE_STATUS, SESSION_STATUS, minuteToTime,
    type AttendanceSummary, type Session,
} from "@/lib/types";

type Mode = "schedule" | "attendance";

const STATUS_COLOR: Record<number, string> = {
    1: colors.success,
    2: colors.danger,
    3: colors.warning,
    4: colors.warning,
};

export default function ScheduleScreen() {
    const { clubGet } = useAuth();
    const [mode, setMode] = useState<Mode>("schedule");
    const [sessions, setSessions] = useState<Session[]>([]);
    const [attendance, setAttendance] = useState<AttendanceSummary>();
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        if (mode === "schedule") {
            setSessions(await clubGet<Session[]>("/api/vh/client/sessions") ?? []);
        } else {
            setAttendance(await clubGet<AttendanceSummary>("/api/vh/client/attendance"));
        }
        setLoading(false);
    }, [clubGet, mode]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    return (
        <View style={styles.screen}>
            <View style={styles.tabs}>
                {(["schedule", "attendance"] as Mode[]).map((value) => (
                    <Pressable
                        key={value}
                        style={[styles.tab, mode === value && styles.tabActive]}
                        onPress={() => setMode(value)}
                    >
                        <Text style={[styles.tabText, mode === value && styles.tabTextActive]}>
                            {value === "schedule" ? "Хуваарь" : "Ирц"}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
            ) : mode === "schedule" ? (
                <FlatList
                    contentContainerStyle={{ padding: spacing.lg }}
                    data={sessions}
                    keyExtractor={(item) => String(item.sessionid)}
                    ListEmptyComponent={<Text style={styles.empty}>Хичээл алга</Text>}
                    renderItem={({ item }) => (
                        <View style={[styles.card, item.status === 3 && styles.cardCancelled]}>
                            <View style={styles.row}>
                                <Text style={styles.date}>{formatDate(item.session_date)}</Text>
                                <Text style={styles.time}>
                                    {minuteToTime(item.start_minute)}-{minuteToTime(item.end_minute)}
                                </Text>
                            </View>
                            <Text style={styles.cardTitle}>{item.groupname}</Text>
                            <Text style={styles.meta}>
                                {[item.venuename, item.coachname].filter(Boolean).join(" · ") || SESSION_STATUS[item.status]}
                            </Text>
                            {item.status === 3 && <Text style={styles.cancelled}>Цуцлагдсан</Text>}
                        </View>
                    )}
                />
            ) : (
                <FlatList
                    contentContainerStyle={{ padding: spacing.lg }}
                    data={attendance?.history ?? []}
                    keyExtractor={(item) => String(item.sessionid)}
                    ListHeaderComponent={
                        attendance ? (
                            <View style={styles.summary}>
                                <Summary label="Ирц" value={`${attendance.rate}%`} highlight />
                                <Summary label="Ирсэн" value={String(attendance.present)} />
                                <Summary label="Тасалсан" value={String(attendance.absent)} />
                                <Summary label="Чөлөө" value={String(attendance.excused)} />
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={<Text style={styles.empty}>Ирцийн бүртгэл алга</Text>}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.row}>
                                <Text style={styles.date}>{formatDate(item.session_date)}</Text>
                                <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>
                                    {ATTENDANCE_STATUS[item.status]}
                                </Text>
                            </View>
                            <Text style={styles.meta}>{item.groupname}</Text>
                            {!!item.note && <Text style={styles.meta}>{item.note}</Text>}
                        </View>
                    )}
                />
            )}
        </View>
    );
}

function Summary({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, highlight && { color: colors.primary }]}>{value}</Text>
            <Text style={styles.summaryLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    tabs: {
        flexDirection: "row", backgroundColor: colors.card,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    tab: {
        flex: 1, paddingVertical: spacing.md, alignItems: "center",
        borderBottomWidth: 2, borderBottomColor: "transparent",
    },
    tabActive: { borderBottomColor: colors.primary },
    tabText: { color: colors.textMuted, fontWeight: "600" },
    tabTextActive: { color: colors.primary },
    card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm },
    cardCancelled: { opacity: 0.55 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    date: { color: colors.textMuted, fontSize: 13 },
    time: { color: colors.primary, fontWeight: "700" },
    cardTitle: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 4 },
    meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    status: { fontWeight: "700" },
    cancelled: { color: colors.danger, marginTop: 4, fontSize: 13 },
    summary: {
        flexDirection: "row", backgroundColor: colors.card, borderRadius: radius.md,
        padding: spacing.lg, marginBottom: spacing.lg,
    },
    summaryItem: { flex: 1, alignItems: "center" },
    summaryValue: { fontSize: 20, fontWeight: "800", color: colors.text },
    summaryLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
});
