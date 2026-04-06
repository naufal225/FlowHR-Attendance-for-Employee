import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PermissionGateStatus } from "../../types/attendance-scan";
import { spacing, typography } from "../../theme/typography";

type PermissionStateViewProps = {
  cameraStatus: PermissionGateStatus;
  locationStatus: PermissionGateStatus;
  moduleAvailable: boolean;
  onRequestPermissions: () => void;
  onOpenSettings: () => void;
  isBusy: boolean;
};

export function PermissionStateView({
  cameraStatus,
  locationStatus,
  moduleAvailable,
  onRequestPermissions,
  onOpenSettings,
  isBusy,
}: PermissionStateViewProps) {
  const hasBlocked = cameraStatus === "blocked" || locationStatus === "blocked";

  return (
    <View style={styles.wrapper}>
      <View style={styles.heroIconWrap}>
        <MaterialCommunityIcons name="camera-account" size={52} color="#1A2435" />
      </View>

      <Text style={styles.title}>Izin Kamera & Lokasi Diperlukan</Text>
      <Text style={styles.description}>
        Kamera digunakan untuk memindai QR kantor, dan lokasi dipakai untuk validasi posisi agar absensi aman dari manipulasi.
      </Text>

      {!moduleAvailable ? (
        <Text style={styles.moduleWarning}>
          Modul permission native belum termuat di binary aplikasi. Build ulang aplikasi terbaru lalu coba lagi.
        </Text>
      ) : null}

      <View style={styles.permissionList}>
        <PermissionRow
          icon="camera"
          title="Kamera"
          status={cameraStatus}
          positiveText="DIIZINKAN"
          negativeText="BELUM DIIZINKAN"
        />

        <PermissionRow
          icon="location"
          title="Lokasi"
          status={locationStatus}
          positiveText="DIIZINKAN"
          negativeText="BELUM DIIZINKAN"
        />
      </View>

      <Pressable
        onPress={hasBlocked ? onOpenSettings : onRequestPermissions}
        style={[styles.primaryButton, isBusy && styles.primaryButtonDisabled]}
        disabled={isBusy}
      >
        <Text style={styles.primaryButtonText}>
          {hasBlocked ? "Buka Pengaturan" : "Izinkan Sekarang"}
        </Text>
      </Pressable>

      <Text style={styles.helperText}>
        Anda belum bisa memindai QR sebelum kedua izin aktif.
      </Text>
    </View>
  );
}

function PermissionRow({
  icon,
  title,
  status,
  positiveText,
  negativeText,
}: {
  icon: "camera" | "location";
  title: string;
  status: PermissionGateStatus;
  positiveText: string;
  negativeText: string;
}) {
  const isGranted = status === "granted";
  const isBlocked = status === "blocked";

  return (
    <View style={[styles.permissionCard, isGranted ? styles.permissionCardGranted : styles.permissionCardDenied]}>
      <View style={styles.permissionIconWrap}>
        <Ionicons
          name={icon === "camera" ? "camera" : "location"}
          size={20}
          color={isGranted ? "#057233" : "#B82020"}
        />
      </View>

      <View style={styles.permissionTextWrap}>
        <Text style={styles.permissionTitle}>{title}</Text>
        <Text style={isGranted ? styles.permissionStatusGranted : styles.permissionStatusDenied}>
          {isGranted ? positiveText : isBlocked ? "DIBLOKIR" : negativeText}
        </Text>
      </View>

      <Ionicons
        name={isGranted ? "checkmark-circle" : "close-circle"}
        size={22}
        color={isGranted ? "#0A7A38" : "#C01B1B"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 24,
    backgroundColor: "#F5F6F8",
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: spacing.s12,
  },
  heroIconWrap: {
    alignSelf: "center",
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8EBF0",
  },
  title: {
    ...typography.titlePage,
    color: "#101623",
    textAlign: "center",
  },
  description: {
    ...typography.body,
    color: "#444D5D",
    textAlign: "center",
  },
  permissionList: {
    gap: spacing.s12,
  },
  permissionCard: {
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 78,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s12,
  },
  permissionCardGranted: {
    backgroundColor: "#D5EEDC",
    borderColor: "#B2DEC0",
  },
  permissionCardDenied: {
    backgroundColor: "#F7E8E8",
    borderColor: "#EBC6C6",
  },
  permissionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTextWrap: {
    flex: 1,
    gap: spacing.s4,
  },
  permissionTitle: {
    ...typography.titleCard,
    fontSize: 18,
    lineHeight: 22,
    color: "#111827",
  },
  permissionStatusGranted: {
    ...typography.labelCaps,
    color: "#0B7B39",
    fontWeight: "800",
  },
  permissionStatusDenied: {
    ...typography.labelCaps,
    color: "#B61E1E",
    fontWeight: "800",
  },
  primaryButton: {
    marginTop: spacing.s8,
    borderRadius: 14,
    minHeight: 50,
    backgroundColor: "#1D64D7",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...typography.titleCard,
    fontSize: 17,
    lineHeight: 22,
    color: "#FFFFFF",
  },
  helperText: {
    ...typography.caption,
    color: "#5D6676",
    textAlign: "center",
  },
  moduleWarning: {
    ...typography.caption,
    color: "#9A1D1D",
    textAlign: "center",
    backgroundColor: "#FBEAEA",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
