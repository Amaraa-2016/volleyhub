import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { colors, radius, spacing } from "@/lib/theme";
import { formatDate, fullName } from "@/lib/format";
import { ROLES, money, type AttendanceSummary, type MyProfile } from "@/lib/types";

export default function ProfileScreen() {
    const { session, clubGet, logout } = useAuth();
    const [profile, setProfile] = useState<MyProfile>();
    const [attendance, setAttendance] = useState<AttendanceSummary>();
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        const me = await clubGet<MyProfile>("/api/vh/client/me");
        setProfile(me);
        // Only a linked student has an attendance record to summarise.
        setAttendance(me?.student ? await clubGet<AttendanceSummary>("/api/vh/client/attendance") : undefined);
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

    const student = profile?.student;

    return (
        <ScrollView style={styles.screen} contentContainerStyle={{ padding: spacing.lg }}>
            <View style={styles.card}>
                <Text style={styles.name}>{session?.name ?? session?.phone}</Text>
                <Text style={styles.meta}>{session?.phone}</Text>
                <Text style={styles.meta}>
                    {session?.tenantname} · {ROLES[profile?.role ?? session?.role ?? ""] ?? profile?.role}
                </Text>
            </View>

            {student ? (
                <View style={styles.card}>
                    <Text style={styles.section}>Суралцагчийн мэдээлэл</Text>
                    <Row label="Нэр" value={fullName(student.last_name, student.first_name)} />
                    <Row label="Групп" value={student.groupname ?? "-"} />
                    {!!student.date_of_birth && (
                        <Row label="Төрсөн огноо" value={formatDate(student.date_of_birth)} />
                    )}
                    {!!student.height_cm && <Row label="Өндөр" value={`${student.height_cm} см`} />}
                    <Row label="Сарын төлбөр" value={money(student.fee_amount)} />
                    {student.balance > 0 && <Row label="Үлдэгдэл" value={money(student.balance)} danger />}
                </View>
            ) : (
                <View style={styles.card}>
                    <Text style={styles.meta}>
                        Таны бүртгэл суралцагчийн картад холбогдоогүй байна. Сургалтын админд
                        хандаж, утасны дугаараа бүртгүүлнэ үү.
                    </Text>
                </View>
            )}

            {attendance && attendance.total > 0 && (
                <View style={styles.card}>
                    <Text style={styles.section}>Ирцийн дүн</Text>
                    <Row label="Ирцийн хувь" value={`${attendance.rate}%`} />
                    <Row label="Ирсэн" value={String(attendance.present)} />
                    <Row label="Хоцорсон" value={String(attendance.late)} />
                    <Row label="Тасалсан" value={String(attendance.absent)} />
                    <Row label="Чөлөөтэй" value={String(attendance.excused)} />
                </View>
            )}

            <Pressable style={styles.secondaryButton} onPress={() => router.push("/club")}>
                <Text style={styles.secondaryText}>Сургалт солих</Text>
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

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={[styles.rowValue, danger && { color: colors.danger }]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.md },
    name: { fontSize: 20, fontWeight: "800", color: colors.text },
    meta: { color: colors.textMuted, fontSize: 13, marginTop: 2, lineHeight: 19 },
    section: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
    row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
    rowLabel: { color: colors.textMuted },
    rowValue: { color: colors.text, fontWeight: "600" },
    secondaryButton: {
        borderWidth: 1, borderColor: colors.primary, borderRadius: radius.sm,
        paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.sm,
    },
    secondaryText: { color: colors.primary, fontWeight: "700" },
    logoutButton: { paddingVertical: spacing.lg, alignItems: "center" },
    logoutText: { color: colors.danger, fontWeight: "600" },
});
