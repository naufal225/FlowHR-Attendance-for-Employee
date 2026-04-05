import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "flowhr_mobile_access_token";
let memoryToken: string | null = null;

function canUseLocalStorage(): boolean {
  return Platform.OS === "web" && typeof globalThis.localStorage !== "undefined";
}

export const authTokenStorage = {
  async get(): Promise<string | null> {
    if (canUseLocalStorage()) {
      try {
        return globalThis.localStorage.getItem(ACCESS_TOKEN_KEY);
      } catch {
        return memoryToken;
      }
    }

    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return memoryToken;
    }
  },

  async set(token: string): Promise<void> {
    memoryToken = token;

    if (canUseLocalStorage()) {
      try {
        globalThis.localStorage.setItem(ACCESS_TOKEN_KEY, token);
      } catch {
        // noop: fallback tetap di memory
      }

      return;
    }

    try {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    } catch {
      // noop: fallback tetap di memory
    }
  },

  async remove(): Promise<void> {
    memoryToken = null;

    if (canUseLocalStorage()) {
      try {
        globalThis.localStorage.removeItem(ACCESS_TOKEN_KEY);
      } catch {
        // noop
      }

      return;
    }

    try {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      // noop
    }
  },
};
