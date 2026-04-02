import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "flowhr_mobile_access_token";

export const authTokenStorage = {
  async get(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },
  async set(token: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
  },
  async remove(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  },
};
