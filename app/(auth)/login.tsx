import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { normalizeApiError } from "../../src/lib/api";
import { useAuthStore } from "../../src/store/auth-store";

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length > 0 && !isSubmitting,
    [email, password, isSubmitting],
  );

  const handleLogin = async () => {
    if (!canSubmit) {
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password,
      });

      router.replace("/(app)/dashboard");
    } catch (error) {
      const apiError = normalizeApiError(error);
      setErrorMessage(apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.page}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandSection}>
          <View style={styles.brandRow}>
            <MaterialCommunityIcons name="cube-outline" size={22} color="#1869D5" />
            <Text style={styles.brandName}>FlowHR</Text>
          </View>
          <Text style={styles.brandSubtitle}>Selamat datang kembali di ruang kerja Anda</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.heading}>Masuk</Text>
          <Text style={styles.description}>
            Masukkan kredensial Anda untuk mengakses dashboard.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EMAIL ATAU USERNAME</Text>
            <View style={styles.inputContainer}>
              <Feather name="at-sign" size={20} color="#9198A2" />
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="nama@perusahaan.com"
                placeholderTextColor="#A5ABB3"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.passwordHeader}>
              <Text style={styles.label}>KATA SANDI</Text>
              <Pressable>
                <Text style={styles.forgotPassword}>Lupa Kata Sandi?</Text>
              </Pressable>
            </View>
            <View style={styles.inputContainer}>
              <Feather name="lock" size={20} color="#9198A2" />
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                placeholder="************"
                placeholderTextColor="#A5ABB3"
                secureTextEntry={isPasswordHidden}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable
                onPress={() => setIsPasswordHidden((current) => !current)}
                hitSlop={8}
              >
                <Feather
                  name={isPasswordHidden ? "eye" : "eye-off"}
                  size={20}
                  color="#565D67"
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.keepSignedRow}>
            <Switch
              value={keepSignedIn}
              onValueChange={setKeepSignedIn}
              trackColor={{ false: "#D4D7DB", true: "#9BC1F0" }}
              thumbColor={keepSignedIn ? "#1869D5" : "#F8FAFC"}
              ios_backgroundColor="#D4D7DB"
            />
            <Text style={styles.keepSignedText}>Biarkan saya tetap masuk</Text>
          </View>

          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

          <Pressable
            disabled={!canSubmit}
            onPress={handleLogin}
            style={({ pressed }) => [
              styles.button,
              (!canSubmit || pressed) && styles.buttonDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>Masuk</Text>
                <Feather name="arrow-right" size={20} color="#FFFFFF" />
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.footerSection}>
          <Text style={styles.footerText}>Belum punya akun?</Text>
          <Pressable>
            <Text style={styles.footerLink}>Hubungi Administrator HR</Text>
          </Pressable>
        </View>

        <View style={styles.dotsContainer}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        <Text style={styles.versionText}>FLOWHR VERSI 2.4.0 • SIAP PERUSAHAAN</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#EEF0F3",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 52,
    paddingBottom: 26,
    justifyContent: "space-between",
  },
  brandSection: {
    alignItems: "center",
    gap: 6,
    marginBottom: 32,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandName: {
    fontSize: 34,
    fontWeight: "800",
    color: "#101317",
    letterSpacing: -0.4,
  },
  brandSubtitle: {
    color: "#535B67",
    fontSize: 15,
    fontWeight: "600",
  },
  formSection: {
    gap: 16,
  },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: "#191D23",
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    color: "#59606B",
    marginTop: -2,
    marginBottom: 10,
  },
  fieldGroup: {
    gap: 9,
  },
  label: {
    fontSize: 12,
    color: "#4D535E",
    letterSpacing: 0.7,
    fontWeight: "700",
  },
  passwordHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  forgotPassword: {
    fontSize: 14,
    color: "#1967D2",
    fontWeight: "700",
  },
  inputContainer: {
    borderRadius: 10,
    backgroundColor: "#DFE1E4",
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 17,
    color: "#2A2E35",
    paddingVertical: 10,
    fontWeight: "500",
  },
  keepSignedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    marginBottom: 2,
    gap: 9,
  },
  keepSignedText: {
    fontSize: 14,
    color: "#555D68",
    fontWeight: "600",
  },
  button: {
    marginTop: 6,
    borderRadius: 26,
    backgroundColor: "#1A67CD",
    minHeight: 52,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1A67CD",
    shadowOpacity: 0.23,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  error: {
    color: "#B91C1C",
    fontSize: 13,
    marginBottom: -3,
  },
  footerSection: {
    alignItems: "center",
    marginTop: 72,
    gap: 8,
  },
  footerText: {
    color: "#5E6570",
    fontSize: 14,
    fontWeight: "500",
  },
  footerLink: {
    color: "#3A404A",
    fontSize: 15,
    fontWeight: "800",
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#BDD4F4",
  },
  dotActive: {
    backgroundColor: "#96BDEB",
  },
  versionText: {
    marginTop: 20,
    textAlign: "center",
    color: "#A3AAB4",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
  },
});


