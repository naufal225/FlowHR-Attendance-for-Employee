import type { ReactNode } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { spacing, typography } from "../theme/typography";

const FLOWHR_LOGO = require("../../assets/FlowHR_logo.png");

type HeaderTone = "default" | "inverse";
type HeaderSurface = "light" | "dark" | "none";

type AppPageHeaderProps = {
  title: string;
  topInset: number;
  tone?: HeaderTone;
  surface?: HeaderSurface;
  leftAccessory?: ReactNode;
  rightAccessory?: ReactNode;
};

export function AppPageHeader({
  title,
  topInset,
  tone = "default",
  surface = "light",
  leftAccessory,
  rightAccessory,
}: AppPageHeaderProps) {
  const isInverse = tone === "inverse";

  return (
    <View style={[styles.wrapper, { paddingTop: topInset + spacing.s6 }]}>
      <View
        style={[
          styles.bar,
          surface === "light" && styles.barLight,
          surface === "dark" && styles.barDark,
          surface === "none" && styles.barNone,
          surface === "none" && styles.barNoPadding,
        ]}
      >
        {/* <View style={styles.sideSlot}>
          {leftAccessory ?? <View style={styles.accessoryPlaceholder} />}
        </View> */}

        <View style={styles.center}>
          <View style={styles.logoWrap}>
            <Image source={FLOWHR_LOGO} style={styles.logoImage} resizeMode="contain" />
          </View>

          <View style={styles.titleWrap}>
            <Text style={[styles.brandText, isInverse && styles.brandTextInverse]}>FlowHR</Text>
            <Text style={[styles.pageTitle, isInverse && styles.pageTitleInverse]}>{title}</Text>
          </View>
        </View>

        <View style={styles.sideSlot}>
          {rightAccessory ?? <View style={styles.accessoryPlaceholder} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.s4,
  },
  bar: {
    minHeight: 62,
    borderRadius: 20,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  barLight: {
    backgroundColor: "#F7F8FA",
    borderWidth: 1,
    borderColor: "#E5EAF2",
  },
  barDark: {
    backgroundColor: "rgba(10, 18, 33, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(204, 218, 240, 0.22)",
  },
  barNone: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  barNoPadding: {
    paddingHorizontal: 0,
  },
  sideSlot: {
    width: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  accessoryPlaceholder: {
    width: 36,
    height: 36,
  },
  center: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s8,
    flex: 1,
  },
  logoWrap: {
    width: 80,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 80,
    height: 44,
  },
  titleWrap: {
    gap: 2,
    flexShrink: 1,
  },
  brandText: {
    ...typography.labelCaps,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "800",
    color: "#3560A5",
  },
  brandTextInverse: {
    color: "#D9E7FF",
  },
  pageTitle: {
    ...typography.titleCard,
    fontSize: 18,
    lineHeight: 22,
    color: "#121A28",
  },
  pageTitleInverse: {
    color: "#F4F7FF",
  },
});
