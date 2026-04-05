import { FontAwesome6, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { typography } from "../theme/typography";

export type BottomTabKey = "dashboard" | "history" | "leave" | "profile";

type BottomNavbarProps = {
  activeTab: BottomTabKey;
  navHeight: number;
  navBottomPadding: number;
  onPressProfile?: () => void;
};

type NavItemConfig = {
  key: BottomTabKey;
  label: string;
  icon: (active: boolean) => ReactNode;
  onPress?: () => void;
};

const ACTIVE_COLOR = "#1D64D7";
const INACTIVE_COLOR = "#7A828F";

export function BottomNavbar({
  activeTab,
  navHeight,
  navBottomPadding,
  onPressProfile,
}: BottomNavbarProps) {
  const navItems: NavItemConfig[] = [
    {
      key: "dashboard",
      label: "DASHBOARD",
      icon: (active) => (
        <Ionicons name={active ? "home" : "home-outline"} size={24} color={active ? ACTIVE_COLOR : INACTIVE_COLOR} />
      ),
      onPress: () => router.replace("/(app)/dashboard"),
    },
    {
      key: "history",
      label: "HISTORY",
      icon: (active) => (
        <MaterialCommunityIcons
          name="history"
          size={24}
          color={active ? ACTIVE_COLOR : INACTIVE_COLOR}
        />
      ),
      onPress: () => router.replace("/(app)/history"),
    },
    {
      key: "leave",
      label: "CUTI",
      icon: (active) => (
        <Ionicons
          name={active ? "calendar" : "calendar-outline"}
          size={23}
          color={active ? ACTIVE_COLOR : INACTIVE_COLOR}
        />
      ),
      onPress: () => router.replace("/(app)/leave"),
    },
    {
      key: "profile",
      label: "PROFIL",
      icon: (active) => (
        <FontAwesome6
          name={active ? "user" : "user"}
          size={18}
          color={active ? ACTIVE_COLOR : INACTIVE_COLOR}
        />
      ),
      onPress: onPressProfile,
    },
  ];

  return (
    <View style={[styles.bottomNav, { height: navHeight, paddingBottom: navBottomPadding }]}>
      {navItems.map((item) => {
        const active = item.key === activeTab;

        return (
          <View key={item.key} style={styles.navItemWrapper}>
            <Pressable
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={item.onPress}
              disabled={!item.onPress}
            >
              {item.icon(active)}
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#F5F6F8",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  navItemWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 20,
    width: 82,
    height: 64,
  },
  navItemActive: {
    backgroundColor: "#DCE8FB",
    shadowColor: "#1D64D7",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  navLabel: {
    ...typography.navLabel,
    color: "#6C7482",
  },
  navLabelActive: {
    color: "#1D64D7",
  },
});
