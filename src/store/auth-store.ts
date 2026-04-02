import { create } from "zustand";
import { authTokenStorage } from "../lib/auth-token-storage";
import {
  isUnauthorizedError,
  mobileAuthApi,
  setAccessToken,
} from "../lib/api";
import type { AuthSession } from "../types/state";

type LoginInput = {
  email: string;
  password: string;
};

type AuthStore = AuthSession & {
  bootstrapAuth: () => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => Promise<void>;
};

const initialSession: AuthSession = {
  token: null,
  user: null,
  isAuthenticated: false,
  isBootstrapping: true,
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialSession,

  bootstrapAuth: async () => {
    if (!get().isBootstrapping) {
      return;
    }

    const savedToken = await authTokenStorage.get();
    if (!savedToken) {
      set({
        ...initialSession,
        isBootstrapping: false,
      });
      return;
    }

    setAccessToken(savedToken);
    set({
      token: savedToken,
      user: null,
      isAuthenticated: true,
      isBootstrapping: true,
    });

    try {
      const meResponse = await mobileAuthApi.fetchMe();
      set({
        token: savedToken,
        user: meResponse.data,
        isAuthenticated: true,
        isBootstrapping: false,
      });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await get().clearSession();
      }

      set((state) => ({
        ...state,
        isBootstrapping: false,
      }));
    }
  },

  login: async ({ email, password }) => {
    const loginResponse = await mobileAuthApi.login({
      email,
      password,
      deviceName: "flowhr-mobile-employee",
    });

    const token = loginResponse.data.token;
    await authTokenStorage.set(token);
    setAccessToken(token);

    set({
      token,
      user: loginResponse.data.user,
      isAuthenticated: true,
      isBootstrapping: false,
    });
  },

  logout: async () => {
    try {
      await mobileAuthApi.logout();
    } catch {
      // Tetap lanjut bersihkan session lokal bila API logout gagal.
    }

    await get().clearSession();
  },

  clearSession: async () => {
    await authTokenStorage.remove();
    setAccessToken(null);

    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isBootstrapping: false,
    });
  },
}));
