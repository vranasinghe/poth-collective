import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../src/ui";
export default function OwnerTabs() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const icon = (name: any) =>
    function TabIcon({ color }: { color: string }) {
      return <Ionicons name={name} color={color} size={22} />;
    };
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.textMuted,
        tabBarStyle: {
          backgroundColor: t.colors.canvas,
          borderTopColor: t.colors.border,
          height: 76 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(8, insets.bottom),
        },
        tabBarLabelStyle: { fontSize: 12, lineHeight: 18, flexShrink: 0 },
        tabBarItemStyle: { minHeight: 52 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Overview", tabBarIcon: icon("grid-outline") }}
      />
      <Tabs.Screen
        name="inventory"
        options={{ title: "Inventory", tabBarIcon: icon("library-outline") }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: "Orders", tabBarIcon: icon("receipt-outline") }}
      />
      <Tabs.Screen
        name="report"
        options={{ title: "Reports", tabBarIcon: icon("bar-chart-outline") }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: "Account", tabBarIcon: icon("person-outline") }}
      />
      <Tabs.Screen name="reviews" options={{ href: null }} />
    </Tabs>
  );
}
