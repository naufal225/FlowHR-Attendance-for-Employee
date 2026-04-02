import type { MobileDashboardPayload, MobileUser } from "./api";

export type AuthSession = {
  token: string | null;
  user: MobileUser | null;
  isBootstrapping: boolean;
  isAuthenticated: boolean;
};

export type DashboardState = {
  data: MobileDashboardPayload | null;
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
};
