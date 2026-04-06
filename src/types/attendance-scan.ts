export type AttendanceScanPhase =
  | "checking-permission"
  | "permission-denied"
  | "scanning"
  | "qr-detected"
  | "getting-location"
  | "submitting"
  | "success"
  | "error";

export type AttendanceScanAction = "check_in" | "check_out";

export type PermissionGateStatus = "granted" | "denied" | "blocked" | "undetermined";

export type AttendancePermissionSnapshot = {
  camera: PermissionGateStatus;
  location: PermissionGateStatus;
  allGranted: boolean;
  hasBlocked: boolean;
  moduleAvailable: boolean;
};
