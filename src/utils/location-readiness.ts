import type { MobileLocationReadiness, MobileLocationStatus } from "../types/api";

type CardAccent = "green" | "neutral";

export type LocationReadinessViewModel = {
  gpsValue: string;
  zoneValue: string;
  gpsAccent: CardAccent;
  zoneAccent: CardAccent;
};

const UNKNOWN_ACCURACY_LABEL = "Akurasi tidak tersedia";
const UNKNOWN_LOCATION_STATUS_LABEL = "Status lokasi tidak tersedia";

export function buildLocationReadinessViewModel(
  readiness: MobileLocationReadiness,
): LocationReadinessViewModel {
  const status = normalizeStatus(readiness.status ?? readiness.location_status);
  const accuracyMeter = normalizeMeter(readiness.accuracy_meter ?? readiness.last_known_accuracy_meter);
  const hasLocationFix = typeof readiness.has_location_fix === "boolean"
    ? readiness.has_location_fix
    : status !== null || accuracyMeter !== null;

  return {
    gpsValue: resolveAccuracyLabel(readiness, accuracyMeter, hasLocationFix),
    zoneValue: resolveStatusLabel(readiness, status, hasLocationFix),
    gpsAccent: hasLocationFix && status === "valid" ? "green" : "neutral",
    zoneAccent: status === "valid" ? "green" : "neutral",
  };
}

function normalizeStatus(status: unknown): MobileLocationStatus | null {
  if (status === "valid" || status === "invalid" || status === "suspicious") {
    return status;
  }

  return null;
}

function normalizeMeter(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
}

function resolveStatusLabel(
  readiness: MobileLocationReadiness,
  status: MobileLocationStatus | null,
  hasLocationFix: boolean,
): string {
  if (!hasLocationFix) {
    return UNKNOWN_LOCATION_STATUS_LABEL;
  }

  const backendLabel = normalizeLabel(readiness.status_label);
  if (backendLabel) {
    return backendLabel;
  }

  return mapStatusToDefaultLabel(status);
}

function resolveAccuracyLabel(
  readiness: MobileLocationReadiness,
  accuracyMeter: number | null,
  hasLocationFix: boolean,
): string {
  if (!hasLocationFix) {
    return UNKNOWN_ACCURACY_LABEL;
  }

  const backendLabel = normalizeLabel(readiness.accuracy_label);
  if (backendLabel) {
    return backendLabel;
  }

  if (accuracyMeter === null) {
    return UNKNOWN_ACCURACY_LABEL;
  }

  return `${mapAccuracyToNeutralLabel(accuracyMeter)} (${formatMeter(accuracyMeter)})`;
}

function normalizeLabel(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function mapStatusToDefaultLabel(status: MobileLocationStatus | null): string {
  if (status === "valid") {
    return "Dalam Radius";
  }

  if (status === "invalid") {
    return "Di Luar Radius";
  }

  if (status === "suspicious") {
    return "Perlu Validasi";
  }

  return UNKNOWN_LOCATION_STATUS_LABEL;
}

function mapAccuracyToNeutralLabel(accuracyMeter: number): string {
  if (accuracyMeter < 50) {
    return "GPS Baik";
  }

  if (accuracyMeter <= 100) {
    return "GPS Cukup";
  }

  return "GPS Lemah";
}

function formatMeter(value: number): string {
  if (Number.isInteger(value)) {
    return `${value} m`;
  }

  return `${value.toFixed(1)} m`;
}
