import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../src/ui";
export default function ReaderTabs() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const icon = (name: any) =>
    function TabIcon({ color }: { color: string }) {
      return <Ionicons name={name} size={22} color={color} />;
    };
  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.textMuted,
        tabBarStyle: {
          backgroundColor: t.colors.canvas,
          borderTopColor: t.colors.border,
          height: 76 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 12, lineHeight: 18, flexShrink: 0 },
        tabBarItemStyle: { minHeight: 52 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: "Home", tabBarIcon: icon("home-outline") }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: "Explore", tabBarIcon: icon("search-outline") }}
      />
      <Tabs.Screen
        name="blogs"
        options={{
          title: "Community",
          tabBarIcon: icon("chatbubbles-outline"),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "Orders", tabBarIcon: icon("bag-outline") }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: "Profile", tabBarIcon: icon("person-outline") }}
      />
      <Tabs.Screen name="reviews" options={{ href: null }} />
      <Tabs.Screen name="alerts" options={{ href: null }} />
    </Tabs>
  );
}
