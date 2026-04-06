import { StyleSheet, Text, View } from "react-native";
import { spacing, typography } from "../../theme/typography";

type ScannerOverlayProps = {
  instruction: string;
  statusLabel: string;
};

export function ScannerOverlay({ instruction, statusLabel }: ScannerOverlayProps) {
  return (
    <View style={styles.overlayContainer} pointerEvents="none">
      <View style={styles.scanFrame} />

      <Text style={styles.instruction}>{instruction}</Text>

      <View style={styles.readyPill}>
        <View style={styles.readyDot} />
        <Text style={styles.readyText}>{statusLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: spacing.s16,
  },
  scanFrame: {
    width: "100%",
    maxWidth: 360,
    aspectRatio: 1,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.92)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  instruction: {
    ...typography.titleCard,
    fontSize: 18,
    lineHeight: 22,
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 12,
  },
  readyPill: {
    borderRadius: 999,
    backgroundColor: "rgba(15, 30, 67, 0.86)",
    paddingHorizontal: 22,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.s8,
  },
  readyDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: "#64D78B",
  },
  readyText: {
    ...typography.labelCaps,
    fontSize: 13,
    color: "#97F8B3",
    letterSpacing: 1.2,
    fontWeight: "800",
  },
});
