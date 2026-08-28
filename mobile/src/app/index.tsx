import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

// Single entry point: wait for the stored session, then send the user to the one screen that makes
// sense - login, club selection, or the app itself.
export default function Index() {
    const { session, loading } = useAuth();

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    if (!session) return <Redirect href="/login" />;
    if (!session.tenantid) return <Redirect href="/club" />;
    return <Redirect href="/(tabs)" />;
}
