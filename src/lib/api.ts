import axios from "axios";
import type {
  MobileAttendanceHistoryResponse,
  MobileAttendanceRecordStatus,
  MobileDashboardResponse,
  MobileLoginResponse,
  MobileMeResponse,
} from "../types/api";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

type ApiErrorPayload = {
  message?: string;
  code?: string;
  error_code?: string;
  status_code?: number;
  errors?: Record<string, string[]>;
};

export type NormalizedApiError = {
  message: string;
  code?: string;
  status?: number;
  errors?: Record<string, string[]>;
};

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

function ensureApiBaseUrl(): void {
  const normalized = API_BASE_URL.trim();

  if (normalized.length === 0) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL belum diatur. Isi file .env terlebih dahulu.",
    );
  }

  if (normalized.includes("<") || normalized.includes(">")) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL masih placeholder. Ganti <LAN_IP_BACKEND> dengan IP LAN backend.",
    );
  }
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    Accept: "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

export function normalizeApiError(error: unknown): NormalizedApiError {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    if (!error.response) {
      return {
        message:
          `Tidak dapat terhubung ke API (${API_BASE_URL}). ` +
          "Pastikan backend aktif dengan `php artisan serve --host=0.0.0.0 --port=8000` dan perangkat mobile berada di jaringan yang sama.",
      };
    }

    const status = error.response?.status;
    const payload = error.response?.data;

    return {
      message:
        payload?.message ??
        error.message ??
        "Terjadi kesalahan saat menghubungi server.",
      code: payload?.code ?? payload?.error_code,
      status,
      errors: payload?.errors,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Terjadi kesalahan yang tidak diketahui." };
}

export function isUnauthorizedError(error: unknown): boolean {
  const normalized = normalizeApiError(error);
  return normalized.status === 401;
}

export const mobileAuthApi = {
  async login(params: {
    email: string;
    password: string;
    deviceName: string;
  }): Promise<MobileLoginResponse> {
    ensureApiBaseUrl();

    const response = await apiClient.post<MobileLoginResponse>("/auth/login", {
      email: params.email,
      password: params.password,
      device_name: params.deviceName,
    });

    return response.data;
  },

  async fetchMe(): Promise<MobileMeResponse> {
    ensureApiBaseUrl();
    const response = await apiClient.get<MobileMeResponse>("/auth/me");
    return response.data;
  },

  async logout(): Promise<void> {
    ensureApiBaseUrl();
    await apiClient.post("/auth/logout");
  },
};

export const mobileDashboardApi = {
  async fetchDashboard(): Promise<MobileDashboardResponse> {
    ensureApiBaseUrl();
    const response = await apiClient.get<MobileDashboardResponse>("/dashboard");
    return response.data;
  },
};

export const mobileAttendanceApi = {
  async fetchHistory(params?: {
    page?: number;
    perPage?: number;
    sortBy?: string;
    sortDirection?: "asc" | "desc";
    startDate?: string;
    endDate?: string;
    recordStatus?: MobileAttendanceRecordStatus;
    isSuspicious?: boolean;
  }): Promise<MobileAttendanceHistoryResponse> {
    ensureApiBaseUrl();

    const response = await apiClient.get<MobileAttendanceHistoryResponse>(
      "/attendance/history",
      {
        params: {
          page: params?.page,
          per_page: params?.perPage,
          sort_by: params?.sortBy,
          sort_direction: params?.sortDirection,
          start_date: params?.startDate,
          end_date: params?.endDate,
          record_status: params?.recordStatus,
          is_suspicious: params?.isSuspicious,
        },
      },
    );

    return response.data;
  },
};
