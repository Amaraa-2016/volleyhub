import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { colors, radius, spacing } from "@/lib/theme";
import { formatDate } from "@/lib/format";
import { FEE_STATUS, PAYMENT_METHODS, money, type FeesResponse } from "@/lib/types";

const STATUS_COLOR: Record<number, string> = {
    1: colors.danger,
    2: colors.warning,
    3: colors.success,
    4: colors.textMuted,
};

export default function FeesScreen() {
    const { clubGet } = useAuth();
    const [data, setData] = useState<FeesResponse>();
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setData(await clubGet<FeesResponse>("/api/vh/client/fees"));
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

    return (
        <FlatList
            style={styles.screen}
            contentContainerStyle={{ padding: spacing.lg }}
            data={data?.fees ?? []}
            keyExtractor={(item) => String(item.feeid)}
            ListHeaderComponent={
                <View style={[styles.balance, (data?.balance ?? 0) > 0 && styles.balanceDue]}>
                    <Text style={styles.balanceLabel}>Төлөх үлдэгдэл</Text>
                    <Text style={[styles.balanceValue, (data?.balance ?? 0) > 0 && { color: colors.danger }]}>
                        {money(data?.balance ?? 0)}
                    </Text>
                </View>
            }
            ListEmptyComponent={<Text style={styles.empty}>Төлбөрийн бүртгэл алга</Text>}
            renderItem={({ item }) => (
                <View style={styles.card}>
                    <View style={styles.row}>
                        <Text style={styles.period}>{item.period}</Text>
                        <Text style={[styles.status, { color: STATUS_COLOR[item.status] }]}>
                            {FEE_STATUS[item.status]}
                        </Text>
                    </View>
                    <Text style={styles.meta}>{item.groupname}</Text>

                    <View style={[styles.row, { marginTop: spacing.sm }]}>
                        <Text style={styles.meta}>Дүн</Text>
                        <Text style={styles.amount}>{money(item.amount)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.meta}>Төлсөн</Text>
                        <Text style={styles.meta}>{money(item.paid_amount)}</Text>
                    </View>
                    {item.balance > 0 && (
                        <View style={styles.row}>
                            <Text style={styles.meta}>Үлдэгдэл</Text>
                            <Text style={[styles.amount, { color: colors.danger }]}>{money(item.balance)}</Text>
                        </View>
                    )}
                    {!!item.due_date && (
                        <Text style={styles.meta}>Эцсийн хугацаа: {formatDate(item.due_date)}</Text>
                    )}

                    {item.payments.length > 0 && (
                        <View style={styles.payments}>
                            {item.payments.map((p) => (
                                <View key={p.paymentid} style={styles.row}>
                                    <Text style={styles.meta}>
                                        {formatDate(p.paid_at)} · {PAYMENT_METHODS[p.method]}
                                    </Text>
                                    <Text style={styles.meta}>{money(p.amount)}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}
        />
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    balance: {
        backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.xl,
        alignItems: "center", marginBottom: spacing.lg,
    },
    balanceDue: { backgroundColor: "#FDECEA" },
    balanceLabel: { color: colors.textMuted, fontSize: 13 },
    balanceValue: { fontSize: 28, fontWeight: "800", color: colors.text, marginTop: 4 },
    card: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.sm },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    period: { fontSize: 16, fontWeight: "700", color: colors.text },
    status: { fontWeight: "700", fontSize: 13 },
    meta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    amount: { color: colors.text, fontWeight: "700" },
    payments: {
        marginTop: spacing.md, paddingTop: spacing.sm,
        borderTopWidth: 1, borderTopColor: colors.border,
    },
    empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
});
