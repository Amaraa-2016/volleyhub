import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { errorText, request } from "@/lib/api";
import { colors, radius, spacing } from "@/lib/theme";
import { ROLES } from "@/lib/types";

interface ClubSearchResult {
    tenantid: number;
    tenantname: string;
    address?: string | null;
}

// Club picker plus the join flow. Shown when the account belongs to no club yet, and reachable
// later from the profile tab.
export default function ClubScreen() {
    const { session, selectClub, refreshMemberships, logout } = useAuth();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ClubSearchResult[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();
    const [notice, setNotice] = useState<string>();

    const active = (session?.tenants ?? []).filter((t) => t.status === "active");
    const pending = (session?.tenants ?? []).filter((t) => t.status !== "active");

    const search = useCallback(async (term: string) => {
        const res = await request<ClubSearchResult[]>(`/api/vh/account/clubs?q=${encodeURIComponent(term)}`);
        setResults(res.data ?? []);
    }, []);

    useEffect(() => { search(""); }, [search]);

    const choose = async (tenantid: number) => {
        setBusy(true);
        setError(undefined);
        const failure = await selectClub(tenantid);
        setBusy(false);

        if (failure) {
            setError(errorText(failure));
            return;
        }
        router.replace("/(tabs)");
    };

    const join = async (tenantid: number) => {
        setBusy(true);
        setError(undefined);
        const res = await request("/api/vh/account/join", {
            body: { tenantid, role: "player" },
            token: session?.accountToken,
        });
        setBusy(false);

        if (res.error) {
            setError(errorText(res.error));
            return;
        }
        setNotice("Хүсэлт илгээгдлээ. Клубын админ баталгаажуулна");
        await refreshMemberships();
    };

    const memberIds = new Set((session?.tenants ?? []).map((t) => t.tenantid));

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.header}>
                <Text style={styles.title}>Клуб</Text>
                <Pressable onPress={async () => { await logout(); router.replace("/login"); }}>
                    <Text style={styles.link}>Гарах</Text>
                </Pressable>
            </View>

            <FlatList
                contentContainerStyle={{ padding: spacing.lg }}
                data={results.filter((c) => !memberIds.has(c.tenantid))}
                keyExtractor={(item) => String(item.tenantid)}
                ListHeaderComponent={
                    <View>
                        {active.length > 0 && (
                            <>
                                <Text style={styles.section}>Миний клубууд</Text>
                                {active.map((m) => (
                                    <Pressable key={m.tenantid} style={styles.card} onPress={() => choose(m.tenantid)}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.cardTitle}>{m.tenantname}</Text>
                                            <Text style={styles.cardMeta}>{ROLES[m.role] ?? m.role}</Text>
                                        </View>
                                        <Text style={styles.cardAction}>Сонгох</Text>
                                    </Pressable>
                                ))}
                            </>
                        )}

                        {pending.map((m) => (
                            <View key={m.tenantid} style={[styles.card, styles.cardMuted]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardTitle}>{m.tenantname}</Text>
                                    <Text style={styles.cardMeta}>Баталгаажуулалт хүлээж байна</Text>
                                </View>
                            </View>
                        ))}

                        {busy && <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />}
                        {error && <Text style={styles.error}>{error}</Text>}
                        {notice && <Text style={styles.notice}>{notice}</Text>}

                        <Text style={styles.section}>Клуб хайх</Text>
                        <TextInput
                            style={styles.input}
                            value={query}
                            onChangeText={(text) => { setQuery(text); search(text); }}
                            placeholder="Клубын нэр"
                            placeholderTextColor={colors.textMuted}
                        />
                    </View>
                }
                renderItem={({ item }) => (
                    <Pressable style={styles.card} onPress={() => join(item.tenantid)}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>{item.tenantname}</Text>
                            {!!item.address && <Text style={styles.cardMeta}>{item.address}</Text>}
                        </View>
                        <Text style={styles.cardAction}>Нэгдэх</Text>
                    </Pressable>
                )}
                ListEmptyComponent={<Text style={styles.empty}>Клуб олдсонгүй</Text>}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.card,
        borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    title: { fontSize: 20, fontWeight: "700", color: colors.text },
    link: { color: colors.primary, fontWeight: "600" },
    section: { fontSize: 13, color: colors.textMuted, marginTop: spacing.lg, marginBottom: spacing.sm },
    card: {
        backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.lg,
        flexDirection: "row", alignItems: "center", marginBottom: spacing.sm,
    },
    cardMuted: { opacity: 0.6 },
    cardTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
    cardMeta: { color: colors.textMuted, marginTop: 2, fontSize: 13 },
    cardAction: { color: colors.primary, fontWeight: "700" },
    input: {
        backgroundColor: colors.card, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
        paddingHorizontal: spacing.md, paddingVertical: spacing.md, marginBottom: spacing.md, color: colors.text,
    },
    empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.lg },
    error: { color: colors.danger, marginTop: spacing.sm },
    notice: { color: colors.success, marginTop: spacing.sm },
});
