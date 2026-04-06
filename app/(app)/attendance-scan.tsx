import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { CameraView, type BarcodeScanningResult } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppPageHeader } from "../../src/components/app-page-header";
import { AttendanceProcessingOverlay } from "../../src/components/attendance/attendance-processing-overlay";
import { AttendanceResultView } from "../../src/components/attendance/attendance-result-view";
import { PermissionStateView } from "../../src/components/attendance/permission-state-view";
import { ScannerOverlay } from "../../src/components/attendance/scanner-overlay";
import {
  getHighAccuracyLocation,
  type AttendanceLocationError,
} from "../../src/hooks/use-attendance-location";
import {
  openAttendanceSettings,
  useAttendancePermissions,
} from "../../src/hooks/use-attendance-permissions";
import {
  isUnauthorizedError,
  mobileAttendanceApi,
  normalizeApiError,
} from "../../src/lib/api";
import { useAuthStore } from "../../src/store/auth-store";
import { spacing, typography } from "../../src/theme/typography";
import type {
  MobileAttendanceCheckInResult,
  MobileAttendanceCheckOutResult,
} from "../../src/types/api";
import type {
  AttendanceScanAction,
  AttendanceScanPhase,
} from "../../src/types/attendance-scan";
import {
  getInstructionLabel,
  getProcessingCopy,
  getReadyLabel,
  mapApiErrorToViewModel,
  mapLocationErrorToViewModel,
  type AttendanceErrorDetail,
  type AttendanceErrorViewModel,
} from "../../src/utils/attendance-scan";

type SuccessViewModel = {
  title: string;
  description: string;
  details: AttendanceErrorDetail[];
};

export default function AttendanceScanScreen() {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const { mode } = useLocalSearchParams<{ mode?: string | string[] }>();

  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const { snapshot, refreshPermissions, requestRequiredPermissions } = useAttendancePermissions();

  const action = useMemo<AttendanceScanAction>(() => {
    const rawMode = Array.isArray(mode) ? mode[0] : mode;
    return rawMode === "check_out" ? "check_out" : "check_in";
  }, [mode]);

  const [phase, setPhase] = useState<AttendanceScanPhase>("checking-permission");
  const [isPermissionBusy, setIsPermissionBusy] = useState(false);
  const [errorViewModel, setErrorViewModel] = useState<AttendanceErrorViewModel | null>(null);
  const [successViewModel, setSuccessViewModel] = useState<SuccessViewModel | null>(null);

  const scanLockedRef = useRef(false);
  const isSubmittingRef = useRef(false);
  const isMountedRef = useRef(true);

  const initializePermissionFlow = useCallback(async () => {
    setIsPermissionBusy(true);
    setPhase("checking-permission");

    try {
      const permissionSnapshot = await requestRequiredPermissions();

      if (!isMountedRef.current) {
        return;
      }

      setIsPermissionBusy(false);
      setPhase(permissionSnapshot.allGranted ? "scanning" : "permission-denied");
    } catch {
      if (!isMountedRef.current) {
        return;
      }

      setIsPermissionBusy(false);
      setPhase("permission-denied");
    }
  }, [requestRequiredPermissions]);

  useEffect(() => {
    isMountedRef.current = true;
    void initializePermissionFlow();

    return () => {
      isMountedRef.current = false;
    };
  }, [initializePermissionFlow]);

  useEffect(() => {
    if (!isFocused || phase !== "permission-denied") {
      return;
    }

    let cancelled = false;

    const syncPermission = async () => {
      const permissionSnapshot = await refreshPermissions();
      if (!cancelled && permissionSnapshot.allGranted) {
        scanLockedRef.current = false;
        isSubmittingRef.current = false;
        setErrorViewModel(null);
        setSuccessViewModel(null);
        setPhase("scanning");
      }
    };

    void syncPermission();

    return () => {
      cancelled = true;
    };
  }, [isFocused, phase, refreshPermissions]);

  const resetScanner = useCallback(() => {
    scanLockedRef.current = false;
    isSubmittingRef.current = false;
    setErrorViewModel(null);
    setSuccessViewModel(null);
    setPhase(snapshot.allGranted ? "scanning" : "permission-denied");
  }, [snapshot.allGranted]);

  const handleOpenSettings = useCallback(() => {
    void openAttendanceSettings();
  }, []);

  const handleBackToDashboard = useCallback(() => {
    router.replace("/(app)/dashboard");
  }, []);

  const handleAttendanceSubmit = useCallback(
    async (qrToken: string) => {
      if (isSubmittingRef.current) {
        return;
      }

      isSubmittingRef.current = true;

      try {
        setPhase("getting-location");
        const location = await getHighAccuracyLocation();

        if (!isMountedRef.current) {
          return;
        }

        setPhase("submitting");

        if (action === "check_out") {
          const response = await mobileAttendanceApi.checkOut({
            qr_token: qrToken,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy_meter: location.accuracyMeter,
          });

          if (!isMountedRef.current) {
            return;
          }

          setSuccessViewModel(buildCheckOutSuccess(response.message, response.data));
          setPhase("success");
          return;
        }

        const response = await mobileAttendanceApi.checkIn({
          qr_token: qrToken,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy_meter: location.accuracyMeter,
        });

        if (!isMountedRef.current) {
          return;
        }

        setSuccessViewModel(buildCheckInSuccess(response.message, response.data));
        setPhase("success");
      } catch (error: unknown) {
        if (!isMountedRef.current) {
          return;
        }

        if (isUnauthorizedError(error)) {
          await logout();
          router.replace("/(auth)/login");
          return;
        }

        const viewModel = isLocationError(error)
          ? mapLocationErrorToViewModel(error)
          : mapApiErrorToViewModel(normalizeApiError(error));

        setErrorViewModel(viewModel);
        setPhase("error");
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [action, logout],
  );

  const handleQrDetected = useCallback(
    (qrToken: string) => {
      if (!isFocused || phase !== "scanning" || scanLockedRef.current) {
        return;
      }

      if (qrToken.length === 0) {
        return;
      }

      scanLockedRef.current = true;
      setPhase("qr-detected");
      void handleAttendanceSubmit(qrToken);
    },
    [handleAttendanceSubmit, isFocused, phase],
  );

  const handleBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (typeof data !== "string") {
        return;
      }

      const qrValue = data.trim();
      if (!qrValue) {
        return;
      }

      handleQrDetected(qrValue);
    },
    [handleQrDetected],
  );

  const scannerActive = isFocused && phase === "scanning";
  const processingCopy = getProcessingCopy(phase);
  const isScannerVisualPhase = phase === "scanning"
    || phase === "qr-detected"
    || phase === "getting-location"
    || phase === "submitting";

  return (
    <View style={styles.screen}>
      <AppPageHeader
        title="Scan Absensi"
        topInset={insets.top}
        tone={isScannerVisualPhase ? "inverse" : "default"}
        surface={isScannerVisualPhase ? "dark" : "light"}
        leftAccessory={(
          <Pressable
            onPress={handleBackToDashboard}
            style={[
              styles.backButton,
              isScannerVisualPhase ? styles.backButtonOnScanner : styles.backButtonOnSurface,
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={isScannerVisualPhase ? "#FFFFFF" : "#334155"}
            />
          </Pressable>
        )}
      />

      {phase === "scanning"
      || phase === "qr-detected"
      || phase === "getting-location"
      || phase === "submitting" ? (
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scannerActive ? handleBarcodeScanned : undefined}
          />

          <View style={styles.scannerShade}>
            <ScannerOverlay
              instruction={getInstructionLabel(action)}
              statusLabel={getReadyLabel(action)}
            />
          </View>

          {phase === "qr-detected"
          || phase === "getting-location"
          || phase === "submitting" ? (
            <AttendanceProcessingOverlay
              title={processingCopy.title}
              description={processingCopy.description}
            />
          ) : null}
        </View>
        ) : null}

      {phase === "checking-permission" ? (
        <View style={styles.stateContainer}>
          <AttendanceProcessingOverlay
            title="Memeriksa Izin"
            description="Kami sedang memeriksa akses kamera dan lokasi untuk absensi."
          />
        </View>
      ) : null}

      {phase === "permission-denied" ? (
        <View style={styles.stateContainer}>
          <PermissionStateView
            cameraStatus={snapshot.camera}
            locationStatus={snapshot.location}
            moduleAvailable={snapshot.moduleAvailable}
            onRequestPermissions={() => void initializePermissionFlow()}
            onOpenSettings={handleOpenSettings}
            isBusy={isPermissionBusy}
          />
        </View>
      ) : null}

      {phase === "error" && errorViewModel ? (
        <View style={styles.stateContainer}>
          <AttendanceResultView
            tone="error"
            title={errorViewModel.title}
            description={errorViewModel.description}
            details={errorViewModel.details}
            primaryActionLabel="Coba Lagi"
            onPrimaryAction={resetScanner}
            secondaryActionLabel={
              errorViewModel.shouldOpenSettings
                ? "Buka Pengaturan"
                : "Kembali ke Dashboard"
            }
            onSecondaryAction={
              errorViewModel.shouldOpenSettings
                ? handleOpenSettings
                : handleBackToDashboard
            }
          />
        </View>
      ) : null}

      {phase === "success" && successViewModel ? (
        <View style={styles.stateContainer}>
          <AttendanceResultView
            tone="success"
            title={successViewModel.title}
            description={successViewModel.description}
            details={successViewModel.details}
            primaryActionLabel="Kembali ke Dashboard"
            onPrimaryAction={handleBackToDashboard}
            secondaryActionLabel={action === "check_in" ? "Lanjut Check Out" : "Scan Lagi"}
            onSecondaryAction={
              action === "check_in"
                ? () => {
                    router.replace({
                      pathname: "/attendance-scan",
                      params: { mode: "check_out" },
                    });
                  }
                : resetScanner
            }
          />
        </View>
      ) : null}

      {phase !== "scanning"
      && phase !== "qr-detected"
      && phase !== "getting-location"
      && phase !== "submitting" ? (
        <View
          style={[
            styles.footerInfo,
            { paddingBottom: Math.max(insets.bottom, spacing.s12) },
          ]}
        >
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={18}
            color="#607086"
          />
          <Text style={styles.footerInfoText}>
            Kamera dipakai untuk scan QR kantor dan lokasi dipakai untuk validasi
            anti manipulasi.
          </Text>
        </View>
        ) : null}

      {phase !== "scanning" ? null : (
        <Text style={styles.userNameTag}>{user?.name ?? "Employee"}</Text>
      )}
    </View>
  );
}

function isLocationError(error: unknown): error is AttendanceLocationError {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const code = String((error as { code?: unknown }).code ?? "");
  const message = String((error as { message?: unknown }).message ?? "");

  return (
    (code === "GPS_DISABLED"
      || code === "LOCATION_TIMEOUT"
      || code === "LOCATION_UNAVAILABLE")
    && message.trim().length > 0
  );
}

function buildCheckInSuccess(
  message: string,
  data: MobileAttendanceCheckInResult,
): SuccessViewModel {
  return {
    title: "Check In Berhasil",
    description: message,
    details: [
      {
        label: "Tanggal",
        value: formatDateLabel(data.work_date),
      },
      {
        label: "Jam Check In",
        value: formatTimeLabel(data.check_in_at),
      },
      {
        label: "Status",
        value: translateStatus(data.check_in_status),
      },
    ],
  };
}

function buildCheckOutSuccess(
  message: string,
  data: MobileAttendanceCheckOutResult,
): SuccessViewModel {
  return {
    title: "Check Out Berhasil",
    description: message,
    details: [
      {
        label: "Tanggal",
        value: formatDateLabel(data.work_date),
      },
      {
        label: "Jam Check Out",
        value: formatTimeLabel(data.check_out_at),
      },
      {
        label: "Status",
        value: translateStatus(data.check_out_status),
      },
    ],
  };
}

function translateStatus(status: string | null): string {
  if (status === "on_time") {
    return "Tepat Waktu";
  }

  if (status === "late") {
    return "Terlambat";
  }

  if (status === "early") {
    return "Pulang Lebih Awal";
  }

  if (status === "overtime") {
    return "Lembur";
  }

  return status ? status.replaceAll("_", " ") : "-";
}

function formatDateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTimeLabel(value: string | null): string {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EDEFF3",
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonOnScanner: {
    backgroundColor: "rgba(11, 20, 36, 0.45)",
  },
  backButtonOnSurface: {
    backgroundColor: "#E8EDF5",
    borderWidth: 1,
    borderColor: "#CFD8E7",
  },
  scannerContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  scannerShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(4, 10, 20, 0.52)",
    paddingTop: 96,
    paddingBottom: 60,
  },
  stateContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  footerInfo: {
    paddingHorizontal: 20,
    paddingTop: spacing.s8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.s8,
  },
  footerInfoText: {
    flex: 1,
    ...typography.caption,
    color: "#576376",
    lineHeight: 18,
  },
  userNameTag: {
    position: "absolute",
    top: 62,
    right: 16,
    ...typography.caption,
    color: "#F4F7FF",
    backgroundColor: "rgba(11,20,36,0.55)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
