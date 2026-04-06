import type { NormalizedApiError } from "../lib/api";
import type { AttendanceLocationError } from "../hooks/use-attendance-location";
import type { AttendanceScanAction, AttendanceScanPhase } from "../types/attendance-scan";

export type AttendanceErrorDetail = {
  label: string;
  value: string;
  badge?: string;
};

export type AttendanceErrorViewModel = {
  title: string;
  description: string;
  details: AttendanceErrorDetail[];
  shouldOpenSettings: boolean;
};

export function getActionTitle(action: AttendanceScanAction): string {
  return action === "check_out" ? "Scan QR Check Out" : "Scan QR Check In";
}

export function getActionButtonLabel(action: AttendanceScanAction): string {
  return action === "check_out" ? "Absen Pulang" : "Absen Masuk";
}

export function getReadyLabel(action: AttendanceScanAction): string {
  return action === "check_out" ? "SIAP CHECK OUT" : "SIAP MEMINDAI";
}

export function getInstructionLabel(action: AttendanceScanAction): string {
  return action === "check_out"
    ? "Arahkan kamera ke QR kantor untuk absen pulang"
    : "Arahkan kamera ke QR kantor untuk absen masuk";
}

export function getProcessingCopy(
  phase: AttendanceScanPhase,
): { title: string; description: string } {
  if (phase === "qr-detected") {
    return {
      title: "QR Terdeteksi",
      description: "Menyiapkan validasi lokasi sebelum absensi diproses.",
    };
  }

  if (phase === "getting-location") {
    return {
      title: "Mengambil Lokasi",
      description: "Pastikan GPS aktif dan Anda berada di area kantor.",
    };
  }

  return {
    title: "Memproses Absensi",
    description: "Mohon tunggu, data absensi sedang dikirim ke server.",
  };
}

export function mapLocationErrorToViewModel(
  error: AttendanceLocationError,
): AttendanceErrorViewModel {
  if (error.code === "GPS_DISABLED") {
    return {
      title: "GPS Belum Aktif",
      description: error.message,
      details: [],
      shouldOpenSettings: true,
    };
  }

  if (error.code === "LOCATION_TIMEOUT") {
    return {
      title: "Lokasi Tidak Ditemukan",
      description: error.message,
      details: [],
      shouldOpenSettings: false,
    };
  }

  return {
    title: "Gagal Mengambil Lokasi",
    description:
      error.message || "Lokasi belum bisa diambil. Coba lagi dengan sinyal GPS yang lebih baik.",
    details: [],
    shouldOpenSettings: false,
  };
}

export function mapApiErrorToViewModel(error: NormalizedApiError): AttendanceErrorViewModel {
  const code = (error.code ?? "").toUpperCase();
  const reason = String(error.context?.reason ?? "").toUpperCase();
  const backendMetaDetails = buildBackendMetaDetails(error);

  if (code === "INVALID_QR_TOKEN") {
    return {
      title: "QR Tidak Valid",
      description: resolveBackendMessage(
        error,
        "QR yang dipindai tidak dikenali. Pastikan Anda memindai QR kantor yang aktif.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "EXPIRED_QR_TOKEN") {
    return {
      title: "QR Kedaluwarsa",
      description: resolveBackendMessage(
        error,
        "QR kantor sudah kedaluwarsa. Minta QR terbaru lalu coba lagi.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "INACTIVE_QR_TOKEN") {
    return {
      title: "QR Tidak Aktif",
      description: resolveBackendMessage(
        error,
        "QR kantor sedang tidak aktif. Hubungi admin jika masalah berlanjut.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "LOCATION_OUT_OF_RANGE") {
    return {
      title: "Di Luar Radius Kantor",
      description: resolveBackendMessage(
        error,
        "Lokasi Anda berada di luar area absensi yang diizinkan.",
      ),
      details: [...buildLocationDetails(error.context), ...backendMetaDetails],
      shouldOpenSettings: false,
    };
  }

  if (code === "LOW_LOCATION_ACCURACY") {
    return {
      title: "Akurasi Lokasi Rendah",
      description: resolveBackendMessage(
        error,
        "Akurasi GPS belum memenuhi batas minimum. Coba pindah ke area terbuka lalu ulangi scan.",
      ),
      details: [...buildAccuracyDetails(error.context), ...backendMetaDetails],
      shouldOpenSettings: false,
    };
  }

  if (code === "LOCATION_MISMATCH") {
    return {
      title: "QR Tidak Sesuai Lokasi",
      description: resolveBackendMessage(
        error,
        "QR yang dipindai bukan untuk lokasi kantor Anda.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "INVALID_LOCATION") {
    return {
      title: "Data Lokasi Tidak Valid",
      description: resolveBackendMessage(
        error,
        "Data lokasi yang dikirim tidak valid. Aktifkan GPS lalu coba scan ulang.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "ALREADY_CHECKED_IN") {
    return {
      title: "Sudah Check In",
      description: resolveBackendMessage(error, "Absensi masuk hari ini sudah tercatat."),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "ALREADY_CHECKED_OUT") {
    return {
      title: "Sudah Check Out",
      description: resolveBackendMessage(error, "Absensi pulang hari ini sudah tercatat."),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "CHECK_IN_NOT_FOUND") {
    return {
      title: "Check In Belum Ada",
      description: resolveBackendMessage(
        error,
        "Anda belum melakukan check-in, sehingga check-out belum bisa diproses.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "ATTENDANCE_NOT_ALLOWED" && reason === "CHECK_IN_WINDOW_CLOSED") {
    return {
      title: "Di Luar Jam Check In",
      description: resolveBackendMessage(
        error,
        "Saat ini belum masuk window waktu check-in yang diizinkan.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "ATTENDANCE_NOT_ALLOWED" && reason === "CHECK_OUT_WINDOW_CLOSED") {
    return {
      title: "Di Luar Jam Check Out",
      description: resolveBackendMessage(
        error,
        "Saat ini belum masuk window waktu check-out yang diizinkan.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "ATTENDANCE_NOT_ALLOWED" && reason === "CHECK_IN_NOT_FOUND") {
    return {
      title: "Check In Belum Ada",
      description: resolveBackendMessage(
        error,
        "Anda belum check-in hari ini sehingga check-out belum bisa diproses.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "ATTENDANCE_NOT_ALLOWED" && reason === "ALREADY_CHECKED_OUT") {
    return {
      title: "Sudah Check Out",
      description: resolveBackendMessage(error, "Check-out hari ini sudah direkam sebelumnya."),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "ATTENDANCE_NOT_ALLOWED" && reason === "ATTENDANCE_NOT_FOUND") {
    return {
      title: "Data Check In Belum Ada",
      description: resolveBackendMessage(
        error,
        "Absensi pulang tidak bisa diproses karena attendance hari ini belum ditemukan.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "ATTENDANCE_NOT_ALLOWED" && reason === "INVALID_RECORD_STATUS") {
    return {
      title: "Status Absensi Tidak Valid",
      description: resolveBackendMessage(
        error,
        "Status attendance hari ini tidak valid untuk memproses check-out.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "ON_LEAVE_ATTENDANCE_NOT_ALLOWED") {
    return {
      title: "Sedang Cuti",
      description: resolveBackendMessage(
        error,
        "Absensi tidak diizinkan karena Anda sedang cuti pada tanggal ini.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "MOBILE_AUTH_NOT_ALLOWED") {
    return {
      title: "Akses Mobile Ditolak",
      description: resolveBackendMessage(
        error,
        "Akun Anda tidak memiliki izin absensi dari aplikasi mobile.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "OFFICE_LOCATION_NOT_ASSIGNED") {
    return {
      title: "Lokasi Kantor Belum Disetel",
      description: resolveBackendMessage(
        error,
        "Akun Anda belum memiliki lokasi kantor yang ditetapkan.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "OFFICE_LOCATION_INACTIVE") {
    return {
      title: "Lokasi Kantor Tidak Aktif",
      description: resolveBackendMessage(
        error,
        "Lokasi kantor saat ini sedang nonaktif sehingga absensi belum bisa diproses.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "ATTENDANCE_POLICY_NOT_FOUND") {
    return {
      title: "Kebijakan Absensi Belum Ada",
      description: resolveBackendMessage(
        error,
        "Pengaturan absensi untuk lokasi kantor belum tersedia.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "OFFICE_LOCATION_COORDINATE_MISSING") {
    return {
      title: "Koordinat Kantor Belum Lengkap",
      description: resolveBackendMessage(
        error,
        "Koordinat kantor belum lengkap sehingga validasi lokasi tidak bisa dilakukan.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "ATTENDANCE_ALREADY_COMPLETED") {
    return {
      title: "Absensi Hari Ini Selesai",
      description: resolveBackendMessage(error, "Absensi hari ini sudah selesai diproses."),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "ATTENDANCE_NOT_FOUND") {
    return {
      title: "Data Absensi Tidak Ditemukan",
      description: resolveBackendMessage(
        error,
        "Data attendance untuk diproses tidak ditemukan.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "ATTENDANCE_NOT_ALLOWED") {
    return {
      title: "Absensi Tidak Diizinkan",
      description: resolveBackendMessage(
        error,
        "Saat ini absensi tidak dapat diproses sesuai kebijakan yang berlaku.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "FORBIDDEN") {
    return {
      title: "Akses Ditolak",
      description: resolveBackendMessage(
        error,
        "Anda tidak memiliki izin untuk melakukan aksi ini.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "NOT_FOUND") {
    return {
      title: "Data Tidak Ditemukan",
      description: resolveBackendMessage(
        error,
        "Resource yang diminta tidak ditemukan.",
      ),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  if (code === "VALIDATION_ERROR") {
    return {
      title: "Data Tidak Valid",
      description: resolveBackendMessage(error, "Permintaan absensi tidak valid."),
      details: [...buildValidationDetails(error.errors), ...backendMetaDetails],
      shouldOpenSettings: false,
    };
  }

  if (code === "UNAUTHORIZED") {
    return {
      title: "Sesi Login Berakhir",
      description: resolveBackendMessage(error, "Silakan login kembali untuk melanjutkan."),
      details: backendMetaDetails,
      shouldOpenSettings: false,
    };
  }

  return {
    title: "Gagal Memproses Absensi",
    description: resolveBackendMessage(
      error,
      "Terjadi kendala saat memproses absensi. Silakan coba beberapa saat lagi.",
    ),
    details: backendMetaDetails,
    shouldOpenSettings: false,
  };
}

function resolveBackendMessage(error: NormalizedApiError, fallback: string): string {
  const message = (error.message ?? "").trim();
  return message.length > 0 ? message : fallback;
}

function buildBackendMetaDetails(_error: NormalizedApiError): AttendanceErrorDetail[] {
  return [];
}

function buildValidationDetails(
  errors: Record<string, string[]> | undefined,
): AttendanceErrorDetail[] {
  if (!errors) {
    return [];
  }

  const entries = Object.entries(errors);
  if (entries.length === 0) {
    return [];
  }

  return entries.slice(0, 3).map(([field, messages]) => ({
    label: field.replaceAll("_", " ").toUpperCase(),
    value: messages[0] ?? "Input tidak valid.",
  }));
}

function buildLocationDetails(
  context: Record<string, unknown> | undefined,
): AttendanceErrorDetail[] {
  if (!context) {
    return [];
  }

  const details: AttendanceErrorDetail[] = [];
  const distance = numberToMeterLabel(context.distance_meter);
  const radius = numberToMeterLabel(context.allowed_radius_meter);

  if (distance) {
    details.push({
      label: "Lokasi Anda",
      value: distance,
      badge: "OUT OF RANGE",
    });
  }

  if (radius) {
    details.push({
      label: "Radius Kantor",
      value: radius,
    });
  }

  return details;
}

function buildAccuracyDetails(
  context: Record<string, unknown> | undefined,
): AttendanceErrorDetail[] {
  if (!context) {
    return [];
  }

  const details: AttendanceErrorDetail[] = [];
  const accuracy = numberToMeterLabel(context.accuracy_meter);
  const minRequired = numberToMeterLabel(context.max_allowed_accuracy_meter);

  if (accuracy) {
    details.push({
      label: "Akurasi Saat Ini",
      value: accuracy,
    });
  }

  if (minRequired) {
    details.push({
      label: "Batas Maksimum",
      value: minRequired,
    });
  }

  return details;
}

function numberToMeterLabel(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const rounded = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded} meter`;
}
