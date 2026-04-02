import { Stack } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LoadingScreen } from "../src/components/loading-screen";
import { useAuthStore } from "../src/store/auth-store";

export default function RootLayout() {
  const bootstrapAuth = useAuthStore((state) => state.bootstrapAuth);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);

  if (isBootstrapping) {
    return <LoadingScreen label="Memuat sesi login..." />;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
