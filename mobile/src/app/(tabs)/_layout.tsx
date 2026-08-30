import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerStyle: { backgroundColor: colors.card },
                headerTitleStyle: { color: colors.text },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Нүүр",
                    tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="schedule"
                options={{
                    title: "Хуваарь",
                    tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="fees"
                options={{
                    title: "Төлбөр",
                    tabBarIcon: ({ color, size }) => <Ionicons name="wallet" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: "Профайл",
                    tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
                }}
            />
        </Tabs>
    );
}
