import axios from "axios";
import type {
  MobileAttendanceCheckInPayload,
  MobileAttendanceCheckInResponse,
  MobileAttendanceCheckOutPayload,
  MobileAttendanceCheckOutResponse,
  MobileAttendanceHistoryResponse,
  MobileAttendanceRecordStatus,
  MobileDashboardResponse,
  MobileLeavePageResponse,
  MobileLoginResponse,
  MobileMeResponse,
  MobilePasswordUpdateResponse,
  MobileProfileUpdateResponse,
} from "../types/api";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "";

type ApiErrorPayload = {
  message?: string;
  code?: string;
  error_code?: string;
  status_code?: number;
  errors?: Record<string, string[]>;
  context?: Record<string, unknown>;
};

export type NormalizedApiError = {
  message: string;
  code?: string;
  status?: number;
  errors?: Record<string, string[]>;
  context?: Record<string, unknown>;
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
      context: payload?.context,
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

export function resolveAssetUrl(path?: string | null): string | null {
  if (!path || path.trim().length === 0) {
    return null;
  }

  const trimmed = path.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const normalizedBase = API_BASE_URL.trim();
  if (!normalizedBase) {
    return trimmed;
  }

  let base = normalizedBase;
  if (base.endsWith("/api/mobile")) {
    base = base.slice(0, -"/api/mobile".length);
  } else if (base.endsWith("/api")) {
    base = base.slice(0, -"/api".length);
  }

  base = base.replace(/\/$/, "");
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${normalizedPath}`;
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
  async checkIn(payload: MobileAttendanceCheckInPayload): Promise<MobileAttendanceCheckInResponse> {
    ensureApiBaseUrl();
    const response = await apiClient.post<MobileAttendanceCheckInResponse>(
      "/attendance/check-in",
      payload,
    );
    return response.data;
  },

  async checkOut(payload: MobileAttendanceCheckOutPayload): Promise<MobileAttendanceCheckOutResponse> {
    ensureApiBaseUrl();
    const response = await apiClient.post<MobileAttendanceCheckOutResponse>(
      "/attendance/check-out",
      payload,
    );
    return response.data;
  },

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

export const mobileLeaveApi = {
  async fetchLeavePage(params?: {
    page?: number;
    perPage?: number;
  }): Promise<MobileLeavePageResponse> {
    ensureApiBaseUrl();

    const response = await apiClient.get<MobileLeavePageResponse>("/employee/leave", {
      params: {
        page: params?.page,
        per_page: params?.perPage,
      },
    });

    return response.data;
  },
};

export const mobileProfileApi = {
  async updateProfile(params: {
    name: string;
    email: string;
    profilePhoto?: {
      uri: string;
      name: string;
      type: string;
    } | null;
  }): Promise<MobileProfileUpdateResponse> {
    ensureApiBaseUrl();

    const formData = new FormData();
    formData.append("name", params.name);
    formData.append("email", params.email);
    if (params.profilePhoto) {
      formData.append("profile_photo", {
        uri: params.profilePhoto.uri,
        name: params.profilePhoto.name,
        type: params.profilePhoto.type,
      } as any);
    }

    const response = await apiClient.post<MobileProfileUpdateResponse>("/profile", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  async updatePassword(params: {
    currentPassword: string;
    newPassword: string;
    newPasswordConfirmation: string;
  }): Promise<MobilePasswordUpdateResponse> {
    ensureApiBaseUrl();
    const response = await apiClient.put<MobilePasswordUpdateResponse>("/profile/password", {
      current_password: params.currentPassword,
      new_password: params.newPassword,
      new_password_confirmation: params.newPasswordConfirmation,
    });
    return response.data;
  },
};
