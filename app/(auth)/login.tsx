import { Feather } from "@expo/vector-icons";
import { Redirect, router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { normalizeApiError } from "../../src/lib/api";
import { useAuthStore } from "../../src/store/auth-store";
import { spacing, typography } from "../../src/theme/typography";

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
      style={styles.page}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <View style={styles.cardBrandSection}>
            <View style={styles.cardLogoWrap}>
              <Image
                source={require("../../assets/FlowHR_logo.png")}
                style={styles.cardLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.heroTitle}>Sign In</Text>
          </View>

          <Text style={styles.description}>
            Gunakan akun yag disediakan perusahaan Anda untuk melanjutkan.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Feather name="at-sign" size={18} color="#6B7280" />
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="nama@perusahaan.com"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Kata Sandi</Text>
            <View style={styles.inputContainer}>
              <Feather name="lock" size={18} color="#6B7280" />
              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                placeholder="Masukkan kata sandi"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={isPasswordHidden}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
              />
              <Pressable
                onPress={() => setIsPasswordHidden((current) => !current)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Toggle password visibility"
              >
                <Feather
                  name={isPasswordHidden ? "eye" : "eye-off"}
                  size={18}
                  color="#4B5563"
                />
              </Pressable>
            </View>
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
                <Feather name="arrow-right" size={18} color="#FFFFFF" />
              </View>
            )}
          </Pressable>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.s20,
    paddingTop: spacing.s20,
    paddingBottom: spacing.s20,
    justifyContent: "center",
    gap: spacing.s16,
  },
  heroTitle: {
    ...typography.titlePage,
    color: "#111827",
    textAlign: "center",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: spacing.s16,
    paddingVertical: spacing.s20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: spacing.s16,
    shadowColor: "#111827",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardBrandSection: {
    alignItems: "center",
    gap: spacing.s8,
    paddingBottom: spacing.s8,
    marginBottom: spacing.s4,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  cardLogoWrap: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: spacing.s8,
    paddingVertical: spacing.s6,
  },
  cardLogo: {
    width: 156,
    height: 52,
  },
  heading: {
    ...typography.titlePage,
    color: "#0F172A",
    marginTop: spacing.s4,
    textAlign: "center"
  },
  description: {
    ...typography.body,
    color: "#6B7280",
    marginTop: -4,
    marginBottom: spacing.s4,
    textAlign:"center"
  },
  fieldGroup: {
    gap: spacing.s6,
  },
  label: {
    ...typography.labelCaps,
    color: "#4B5563",
  },
  inputContainer: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: spacing.s12,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s8,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: "#111827",
    paddingVertical: 10,
  },
  error: {
    ...typography.caption,
    color: "#B91C1C",
    marginTop: 2,
    marginBottom: -2,
  },
  button: {
    marginTop: spacing.s8,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: "#0A63C9",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s8,
  },
  buttonText: {
    ...typography.body,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  versionText: {
    ...typography.caption,
    textAlign: "center",
    color: "#9CA3AF",
    letterSpacing: 0.6,
    marginTop: spacing.s12,
  },
});
