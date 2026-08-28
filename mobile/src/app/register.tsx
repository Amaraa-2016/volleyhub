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

export default function RegisterScreen() {
    const { register } = useAuth();
    const [values, setValues] = useState({ lastname: "", firstname: "", phone: "", password: "" });
    const [error, setError] = useState<string>();
    const [busy, setBusy] = useState(false);

    const set = (key: keyof typeof values) => (text: string) =>
        setValues((prev) => ({ ...prev, [key]: text }));

    const submit = async () => {
        if (values.password.length < 6) {
            setError(errorText("password_too_short"));
            return;
        }

        setBusy(true);
        setError(undefined);
        const failure = await register({
            phone: values.phone.trim(),
            password: values.password,
            lastname: values.lastname.trim() || undefined,
            firstname: values.firstname.trim() || undefined,
        });
        setBusy(false);

        if (failure) {
            setError(errorText(failure));
            return;
        }
        // A brand-new account belongs to no club yet, so index.tsx sends them to the picker.
        router.replace("/");
    };

    return (
        <SafeAreaView style={styles.safe}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <Text style={styles.brand}>Бүртгүүлэх</Text>

                    <View style={styles.card}>
                        <Text style={styles.label}>Овог</Text>
                        <TextInput style={styles.input} value={values.lastname} onChangeText={set("lastname")} />

                        <Text style={styles.label}>Нэр</Text>
                        <TextInput style={styles.input} value={values.firstname} onChangeText={set("firstname")} />

                        <Text style={styles.label}>Утасны дугаар</Text>
                        <TextInput
                            style={styles.input}
                            value={values.phone}
                            onChangeText={set("phone")}
                            keyboardType="phone-pad"
                            placeholder="99001122"
                            placeholderTextColor={colors.textMuted}
                        />

                        <Text style={styles.label}>Нууц үг</Text>
                        <TextInput
                            style={styles.input}
                            value={values.password}
                            onChangeText={set("password")}
                            secureTextEntry
                        />

                        {error && <Text style={styles.error}>{error}</Text>}

                        <Pressable style={[styles.button, busy && styles.buttonBusy]} onPress={submit} disabled={busy}>
                            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Бүртгүүлэх</Text>}
                        </Pressable>

                        <Pressable onPress={() => router.back()} style={styles.linkRow}>
                            <Text style={styles.link}>Буцах</Text>
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
    brand: { color: "#fff", fontSize: 26, fontWeight: "800", textAlign: "center", marginBottom: spacing.xl },
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
