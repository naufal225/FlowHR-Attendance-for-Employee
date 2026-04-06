import { useCallback, useState } from "react";
import { Camera } from "expo-camera";
import * as Location from "expo-location";
import { Linking } from "react-native";
import type {
  AttendancePermissionSnapshot,
  PermissionGateStatus,
} from "../types/attendance-scan";

function mapExpoPermissionStatus(response: {
  status: string;
  granted: boolean;
  canAskAgain: boolean;
}): PermissionGateStatus {
  if (response.granted || response.status === "granted") {
    return "granted";
  }

  if (response.status === "denied" && response.canAskAgain === false) {
    return "blocked";
  }

  if (response.status === "denied") {
    return "denied";
  }

  return "undetermined";
}

function buildSnapshot(
  camera: PermissionGateStatus,
  location: PermissionGateStatus,
): AttendancePermissionSnapshot {
  const allGranted = camera === "granted" && location === "granted";

  return {
    camera,
    location,
    allGranted,
    hasBlocked: camera === "blocked" || location === "blocked",
    moduleAvailable: true,
  };
}

async function getPermissionSnapshot(): Promise<AttendancePermissionSnapshot> {
  try {
    const [cameraPermission, locationPermission] = await Promise.all([
      Camera.getCameraPermissionsAsync(),
      Location.getForegroundPermissionsAsync(),
    ]);

    return buildSnapshot(
      mapExpoPermissionStatus(cameraPermission),
      mapExpoPermissionStatus(locationPermission),
    );
  } catch {
    return buildSnapshot("denied", "denied");
  }
}

export async function openAttendanceSettings(): Promise<void> {
  await Linking.openSettings();
}

export function useAttendancePermissions() {
  const [snapshot, setSnapshot] = useState<AttendancePermissionSnapshot>(() => ({
    camera: "undetermined",
    location: "undetermined",
    allGranted: false,
    hasBlocked: false,
    moduleAvailable: true,
  }));

  const refreshPermissions = useCallback(async () => {
    const currentSnapshot = await getPermissionSnapshot();
    setSnapshot(currentSnapshot);
    return currentSnapshot;
  }, []);

  const requestRequiredPermissions = useCallback(async () => {
    try {
      const [cameraPermission, locationPermission] = await Promise.all([
        Camera.requestCameraPermissionsAsync(),
        Location.requestForegroundPermissionsAsync(),
      ]);

      const nextSnapshot = buildSnapshot(
        mapExpoPermissionStatus(cameraPermission),
        mapExpoPermissionStatus(locationPermission),
      );
      setSnapshot(nextSnapshot);

      return nextSnapshot;
    } catch {
      const deniedSnapshot = buildSnapshot("denied", "denied");
      setSnapshot(deniedSnapshot);
      return deniedSnapshot;
    }
  }, []);

  return {
    snapshot,
    refreshPermissions,
    requestRequiredPermissions,
  };
}
