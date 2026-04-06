import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { spacing, typography } from "../../theme/typography";

type ResultDetail = {
  label: string;
  value: string;
  badge?: string;
};

type AttendanceResultViewProps = {
  tone: "success" | "error";
  title: string;
  description: string;
  details?: ResultDetail[];
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
};

export function AttendanceResultView({
  tone,
  title,
  description,
  details,
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
  onSecondaryAction,
}: AttendanceResultViewProps) {
  const isSuccess = tone === "success";

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={[styles.heroIconWrap, isSuccess ? styles.heroIconSuccess : styles.heroIconError]}>
          <Ionicons
            name={isSuccess ? "checkmark" : "alert"}
            size={48}
            color={isSuccess ? "#0C7A37" : "#B61F1F"}
          />
        </View>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {details && details.length > 0 ? (
        <View style={styles.detailsCard}>
          {details.map((detail, index) => (
            <View key={`${detail.label}-${index}`}>
              <View style={styles.detailRow}>
                <View style={styles.detailLeft}>
                  <View style={styles.detailIconWrap}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#4A5361" />
                  </View>
                  <View style={styles.detailTextWrap}>
                    <Text style={styles.detailLabel}>{detail.label}</Text>
                    <Text style={styles.detailValue}>{detail.value}</Text>
                  </View>
                </View>
                {detail.badge ? <Text style={styles.badge}>{detail.badge}</Text> : null}
              </View>
              {index < details.length - 1 ? <View style={styles.divider} /> : null}
            </View>
          ))}
        </View>
      ) : null}

      <Pressable style={styles.primaryButton} onPress={onPrimaryAction}>
        <Text style={styles.primaryButtonText}>{primaryActionLabel}</Text>
      </Pressable>

      {secondaryActionLabel && onSecondaryAction ? (
        <Pressable style={styles.secondaryButton} onPress={onSecondaryAction}>
          <Text style={styles.secondaryButtonText}>{secondaryActionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
    gap: spacing.s12,
  },
  heroCard: {
    height: 170,
    borderRadius: 24,
    backgroundColor: "#E9EBEF",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIconWrap: {
    width: 124,
    height: 124,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F8FA",
  },
  heroIconSuccess: {
    borderWidth: 1,
    borderColor: "#CFE8D8",
  },
  heroIconError: {
    borderWidth: 1,
    borderColor: "#EDC8C8",
  },
  title: {
    ...typography.titlePage,
    color: "#0F1624",
    textAlign: "center",
  },
  description: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 24,
    color: "#414A5B",
    textAlign: "center",
  },
  detailsCard: {
    borderRadius: 18,
    backgroundColor: "#F4F6F8",
    borderWidth: 1,
    borderColor: "#E1E6EE",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: spacing.s8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.s8,
    minHeight: 64,
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s8,
    flex: 1,
  },
  detailIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#E7EAF0",
    alignItems: "center",
    justifyContent: "center",
  },
  detailTextWrap: {
    flex: 1,
    gap: spacing.s4,
  },
  detailLabel: {
    ...typography.labelCaps,
    color: "#737C8D",
  },
  detailValue: {
    ...typography.titleCard,
    fontSize: 18,
    lineHeight: 24,
    color: "#111827",
  },
  badge: {
    ...typography.labelCaps,
    fontSize: 12,
    color: "#C22222",
    backgroundColor: "#F4DCDD",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: "#DEE3EA",
  },
  primaryButton: {
    marginTop: spacing.s8,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#1D64D7",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    ...typography.titleCard,
    fontSize: 17,
    lineHeight: 22,
    color: "#FFFFFF",
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD3E1",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    ...typography.body,
    color: "#2E3B51",
    fontWeight: "700",
  },
});
