import * as Location from "expo-location";
import { Platform } from "react-native";

export type AttendanceLocationErrorCode =
  | "GPS_DISABLED"
  | "LOCATION_TIMEOUT"
  | "LOCATION_UNAVAILABLE";

export type AttendanceLocationError = {
  code: AttendanceLocationErrorCode;
  message: string;
};

export type AttendanceLocationResult = {
  latitude: number;
  longitude: number;
  accuracyMeter: number | null;
};

const LOCATION_TIMEOUT_MS = 15000;
const LOCATION_TIMEOUT_ERROR = "LOCATION_TIMEOUT";
const LAST_KNOWN_MAX_AGE_MS = 60_000;
const LAST_KNOWN_REQUIRED_ACCURACY_M = 200;
const SECONDARY_LOCATION_TIMEOUT_MS = 10000;
const LAST_KNOWN_MAX_AGE_EXTENDED_MS = 180_000;
const LAST_KNOWN_REQUIRED_ACCURACY_EXTENDED_M = 500;

type TimeoutError = {
  code: typeof LOCATION_TIMEOUT_ERROR;
  message: string;
};

function isTimeoutError(error: unknown): error is TimeoutError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === LOCATION_TIMEOUT_ERROR
  );
}

function isPermissionError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeCode = String(
    (error as { code?: unknown }).code ?? "",
  ).toLowerCase();
  const maybeMessage = String(
    (error as { message?: unknown }).message ?? "",
  ).toLowerCase();

  return (
    maybeCode.includes("permission") || maybeMessage.includes("permission")
  );
}

function normalizeErrorCode(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "";
  }

  return String((error as { code?: unknown }).code ?? "").toUpperCase();
}

function normalizeErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "";
  }

  return String((error as { message?: unknown }).message ?? "").toLowerCase();
}

function mapExpoLocationError(error: unknown): AttendanceLocationError {
  const code = normalizeErrorCode(error);
  const message = normalizeErrorMessage(error);

  if (
    isTimeoutError(error) ||
    code === "E_LOCATION_TIMEOUT" ||
    message.includes("timeout")
  ) {
    return {
      code: "LOCATION_TIMEOUT",
      message:
        "Permintaan lokasi melebihi batas waktu. Pastikan GPS aktif dan sinyal memadai.",
    };
  }

  if (
    code === "E_LOCATION_SERVICES_DISABLED" ||
    code === "E_LOCATION_SETTINGS_UNSATISFIED" ||
    message.includes("services are disabled") ||
    message.includes("settings unsatisfied") ||
    message.includes("provider")
  ) {
    return {
      code: "GPS_DISABLED",
      message:
        "Layanan lokasi perangkat belum aktif atau mode akurasi tinggi belum aktif. Aktifkan GPS lalu coba lagi.",
    };
  }

  if (
    isPermissionError(error) ||
    code === "E_LOCATION_UNAUTHORIZED" ||
    code === "E_NO_PERMISSIONS"
  ) {
    return {
      code: "GPS_DISABLED",
      message:
        "Izin lokasi belum aktif. Izinkan akses lokasi agar absensi bisa diproses.",
    };
  }

  if (code === "E_LOCATION_UNAVAILABLE" || message.includes("unavailable")) {
    return {
      code: "LOCATION_UNAVAILABLE",
      message:
        "Sinyal lokasi belum stabil. Coba pindah ke area yang lebih terbuka lalu ulangi scan.",
    };
  }

  return {
    code: "LOCATION_UNAVAILABLE",
    message: "Lokasi tidak dapat diambil saat ini. Coba lagi beberapa saat.",
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject({
          code: LOCATION_TIMEOUT_ERROR,
          message:
            "Permintaan lokasi melebihi batas waktu. Pastikan GPS aktif dan sinyal memadai.",
        } satisfies TimeoutError);
      }, timeoutMs);
    }),
  ]);
}

export async function getHighAccuracyLocation(): Promise<AttendanceLocationResult> {
  const isGpsEnabled = await Location.hasServicesEnabledAsync();
  if (!isGpsEnabled) {
    throw {
      code: "GPS_DISABLED",
      message:
        "Layanan lokasi perangkat belum aktif. Aktifkan GPS lalu coba lagi.",
    } satisfies AttendanceLocationError;
  }

  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) {
    throw {
      code: "GPS_DISABLED",
      message:
        "Izin lokasi belum aktif. Izinkan akses lokasi agar absensi bisa diproses.",
    } satisfies AttendanceLocationError;
  }

  // Android kadang belum menyalakan network provider walau permission sudah granted.
  if (Platform.OS === "android") {
    await Location.enableNetworkProviderAsync();
  }

  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        mayShowUserSettingsDialog: true,
      }),
      LOCATION_TIMEOUT_MS,
    );

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracyMeter:
        typeof position.coords.accuracy === "number"
          ? Math.max(0, position.coords.accuracy)
          : null,
    };
  } catch (error: unknown) {
    const mappedError = mapExpoLocationError(error);

    if (
      mappedError.code === "LOCATION_TIMEOUT" ||
      mappedError.code === "LOCATION_UNAVAILABLE"
    ) {
      try {
        const secondaryPosition = await withTimeout(
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
            mayShowUserSettingsDialog: true,
          }),
          SECONDARY_LOCATION_TIMEOUT_MS,
        );

        return {
          latitude: secondaryPosition.coords.latitude,
          longitude: secondaryPosition.coords.longitude,
          accuracyMeter:
            typeof secondaryPosition.coords.accuracy === "number"
              ? Math.max(0, secondaryPosition.coords.accuracy)
              : null,
        };
      } catch {
        // lanjut fallback ke last known position
      }

      const lastKnownPosition = await Location.getLastKnownPositionAsync({
        maxAge: LAST_KNOWN_MAX_AGE_MS,
        requiredAccuracy: LAST_KNOWN_REQUIRED_ACCURACY_M,
      });

      if (lastKnownPosition) {
        return {
          latitude: lastKnownPosition.coords.latitude,
          longitude: lastKnownPosition.coords.longitude,
          accuracyMeter:
            typeof lastKnownPosition.coords.accuracy === "number"
              ? Math.max(0, lastKnownPosition.coords.accuracy)
              : null,
        };
      }

      const fallbackLastKnownPosition =
        await Location.getLastKnownPositionAsync({
          maxAge: LAST_KNOWN_MAX_AGE_EXTENDED_MS,
          requiredAccuracy: LAST_KNOWN_REQUIRED_ACCURACY_EXTENDED_M,
        });

      if (fallbackLastKnownPosition) {
        return {
          latitude: fallbackLastKnownPosition.coords.latitude,
          longitude: fallbackLastKnownPosition.coords.longitude,
          accuracyMeter:
            typeof fallbackLastKnownPosition.coords.accuracy === "number"
              ? Math.max(0, fallbackLastKnownPosition.coords.accuracy)
              : null,
        };
      }
    }

    throw mappedError;
  }
}
