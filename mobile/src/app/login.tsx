import { useState } from "react";
import {
    ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView,
    StyleSheet, Text, TextInput, View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { errorText } from "@/lib/api";
import { colors, radius, spacing } from "@/lib/theme";

export default function LoginScreen() {
    const { login } = useAuth();
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string>();
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setBusy(true);
        setError(undefined);
        const failure = await login(phone.trim(), password);
        setBusy(false);

        if (failure) {
            setError(errorText(failure));
            return;
        }
        // index.tsx decides where to go next: the club picker, or straight into the tabs.
        router.replace("/");
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <Text style={styles.brand}>Volleyhub</Text>
                    <Text style={styles.subtitle}>Волейболын сургалтын апп</Text>

                    <View style={styles.card}>
                        <Text style={styles.label}>Утасны дугаар</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            autoComplete="tel"
                            placeholder="99001122"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={styles.label}>Нууц үг</Text>
                        <TextInput
                            style={styles.input}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            autoComplete="current-password"
                        />

                        {error && <Text style={styles.error}>{error}</Text>}

                        <Pressable style={[styles.button, busy && styles.buttonBusy]} onPress={submit} disabled={busy}>
                            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Нэвтрэх</Text>}
                        </Pressable>

                        <Pressable onPress={() => router.push("/register")} style={styles.linkRow}>
                            <Text style={styles.link}>Бүртгэл байхгүй юу? Бүртгүүлэх</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.ink },
    container: { flexGrow: 1, justifyContent: "center", padding: spacing.xl },
    brand: { color: "#fff", fontSize: 32, fontWeight: "800", textAlign: "center", letterSpacing: -0.8 },
    subtitle: { color: "#9AA1AC", textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.xl },
    card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl },
    label: { color: colors.textMuted, marginBottom: spacing.xs, marginTop: spacing.md, fontSize: 13 },
    input: {
        borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
        paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 16, color: colors.text,
    },
    button: {
        backgroundColor: colors.primary, borderRadius: radius.sm, paddingVertical: spacing.md,
        alignItems: "center", marginTop: spacing.xl,
    },
    buttonBusy: { opacity: 0.7 },
    buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
    linkRow: { marginTop: spacing.lg, alignItems: "center" },
    link: { color: colors.primary, fontWeight: "600" },
    error: { color: colors.danger, marginTop: spacing.md },
});
