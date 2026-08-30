import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth";

// The whole app sits inside AuthProvider so the session is read from secure storage once, before
// any screen renders. Routing between the auth screens and the tabs is decided in app/index.tsx.
export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <AuthProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="login" />
                    <Stack.Screen name="register" />
                    <Stack.Screen name="club" />
                    <Stack.Screen name="(tabs)" />
                </Stack>
            </AuthProvider>
        </SafeAreaProvider>
    );
}
