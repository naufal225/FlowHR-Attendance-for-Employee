import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { spacing, typography } from "../../theme/typography";

type AttendanceProcessingOverlayProps = {
  title: string;
  description: string;
};

export function AttendanceProcessingOverlay({
  title,
  description,
}: AttendanceProcessingOverlayProps) {
  return (
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#1D64D7" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 14, 25, 0.58)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: "#F7F8FA",
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: "center",
    gap: spacing.s8,
  },
  title: {
    ...typography.titleCard,
    color: "#111827",
    textAlign: "center",
  },
  description: {
    ...typography.body,
    color: "#4C5667",
    textAlign: "center",
  },
});
