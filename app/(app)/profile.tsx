import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";
import { BottomNavbar } from "../../src/components/bottom-navbar";
import {
  mobileProfileApi,
  normalizeApiError,
  resolveAssetUrl,
} from "../../src/lib/api";
import { useAuthStore } from "../../src/store/auth-store";
import { spacing, typography } from "../../src/theme/typography";

type Notice = {
  type: "success" | "error";
  message: string;
};

type FieldErrors = Record<string, string>;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const {
    user,
    isBootstrapping,
    logout,
    refreshMe,
    setUser,
  } = useAuthStore(
    useShallow((state) => ({
      user: state.user,
      isBootstrapping: state.isBootstrapping,
      logout: state.logout,
      refreshMe: state.refreshMe,
      setUser: state.setUser,
    })),
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
  const [photoPayload, setPhotoPayload] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [profileErrors, setProfileErrors] = useState<FieldErrors>({});
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [hideCurrentPassword, setHideCurrentPassword] = useState(true);
  const [hideNewPassword, setHideNewPassword] = useState(true);
  const [hideConfirmPassword, setHideConfirmPassword] = useState(true);
  const [isPasswordFormVisible, setIsPasswordFormVisible] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  const navBottomPadding = Math.max(insets.bottom, 8);
  const navHeight = 78 + navBottomPadding;
  const scrollTopPadding = Math.max(insets.top + 12, 20);
  const scrollBottomPadding = navHeight + 28;

  const hasProfile = Boolean(user?.id);

  const profileInitials = useMemo(() => {
    if (!user?.name) return "U";
    const parts = user.name.trim().split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase());
    return initials.join("") || "U";
  }, [user?.name]);

  useEffect(() => {
    if (!user || hasInitialized) {
      return;
    }

    setName(user.name ?? "");
    setEmail(user.email ?? "");
    setPhotoPreviewUri(resolveAssetUrl(user.url_profile));
    setPhotoPayload(null);
    setHasInitialized(true);
  }, [user, hasInitialized]);

  const showNotice = useCallback((next: Notice) => {
    setNotice(next);
  }, []);

  const clearNotice = useCallback(() => {
    setNotice(null);
  }, []);

  const handleRefreshProfile = useCallback(async () => {
    setIsRefreshing(true);
    clearNotice();

    try {
      await refreshMe();
    } catch (error) {
      const apiError = normalizeApiError(error);
      showNotice({ type: "error", message: apiError.message });
    } finally {
      setIsRefreshing(false);
    }
  }, [clearNotice, refreshMe, showNotice]);

  const handlePickPhoto = useCallback(async () => {
    clearNotice();
    setProfileErrors({});

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      showNotice({
        type: "error",
        message: "Izin galeri diperlukan untuk mengganti foto profil.",
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    const asset = result.assets[0];
    const fileName = asset.fileName ?? `profile-${Date.now()}.jpg`;
    const mimeType = asset.mimeType ?? "image/jpeg";

    setPhotoPreviewUri(asset.uri);
    setPhotoPayload({
      uri: asset.uri,
      name: fileName,
      type: mimeType,
    });
  }, [clearNotice, showNotice]);

  const handleSaveProfile = useCallback(async () => {
    clearNotice();
    setProfileErrors({});

    if (!name.trim() || !email.trim()) {
      const nextErrors: FieldErrors = {};
      if (!name.trim()) nextErrors.name = "Nama wajib diisi.";
      if (!email.trim()) nextErrors.email = "Email wajib diisi.";
      setProfileErrors(nextErrors);
      showNotice({
        type: "error",
        message: "Periksa kembali data profil yang wajib diisi.",
      });
      return;
    }

    setIsSavingProfile(true);

    try {
      const response = await mobileProfileApi.updateProfile({
        name: name.trim(),
        email: email.trim(),
        profilePhoto: photoPayload,
      });
      setUser(response.data);
      setPhotoPreviewUri(resolveAssetUrl(response.data.url_profile) ?? photoPreviewUri);
      setPhotoPayload(null);
      showNotice({ type: "success", message: response.message });
    } catch (error) {
      const apiError = normalizeApiError(error);
      if (apiError.errors) {
        const mappedErrors: FieldErrors = {};
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          mappedErrors[field] = messages?.[0] ?? apiError.message;
        });
        setProfileErrors(mappedErrors);
      }
      showNotice({
        type: "error",
        message: apiError.message,
      });
    } finally {
      setIsSavingProfile(false);
    }
  }, [
    clearNotice,
    email,
    name,
    photoPayload,
    photoPreviewUri,
    setUser,
    showNotice,
  ]);

  const handleUpdatePassword = useCallback(async () => {
    clearNotice();
    setPasswordErrors({});

    if (!passwordCurrent || !passwordNew || !passwordConfirm) {
      const nextErrors: FieldErrors = {};
      if (!passwordCurrent) nextErrors.current_password = "Password saat ini wajib diisi.";
      if (!passwordNew) nextErrors.new_password = "Password baru wajib diisi.";
      if (!passwordConfirm) {
        nextErrors.new_password_confirmation = "Konfirmasi password wajib diisi.";
      }
      setPasswordErrors(nextErrors);
      showNotice({
        type: "error",
        message: "Lengkapi semua field password terlebih dahulu.",
      });
      return;
    }

    if (passwordNew !== passwordConfirm) {
      setPasswordErrors({
        new_password_confirmation: "Konfirmasi password belum sama.",
      });
      showNotice({
        type: "error",
        message: "Password baru dan konfirmasi belum sama.",
      });
      return;
    }

    setIsSavingPassword(true);

    try {
      const response = await mobileProfileApi.updatePassword({
        currentPassword: passwordCurrent,
        newPassword: passwordNew,
        newPasswordConfirmation: passwordConfirm,
      });
      setPasswordCurrent("");
      setPasswordNew("");
      setPasswordConfirm("");
      setHideCurrentPassword(true);
      setHideNewPassword(true);
      setHideConfirmPassword(true);
      setIsPasswordFormVisible(false);
      showNotice({ type: "success", message: response.message });
    } catch (error) {
      const apiError = normalizeApiError(error);
      if (apiError.errors) {
        const mappedErrors: FieldErrors = {};
        Object.entries(apiError.errors).forEach(([field, messages]) => {
          mappedErrors[field] = messages?.[0] ?? apiError.message;
        });
        setPasswordErrors(mappedErrors);
      }
      showNotice({
        type: "error",
        message: apiError.message,
      });
    } finally {
      setIsSavingPassword(false);
    }
  }, [
    clearNotice,
    passwordConfirm,
    passwordCurrent,
    passwordNew,
    showNotice,
  ]);

  const handleOpenPasswordForm = useCallback(() => {
    clearNotice();
    setPasswordErrors({});
    setIsPasswordFormVisible(true);
  }, [clearNotice]);

  const handleCancelPasswordForm = useCallback(() => {
    setPasswordCurrent("");
    setPasswordNew("");
    setPasswordConfirm("");
    setPasswordErrors({});
    setHideCurrentPassword(true);
    setHideNewPassword(true);
    setHideConfirmPassword(true);
    setIsPasswordFormVisible(false);
  }, []);

  if (isBootstrapping) {
    return (
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: scrollTopPadding, paddingBottom: scrollBottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.skeletonProfileCard}>
            <View style={styles.skeletonAvatar} />
            <View style={[styles.skeletonLine, styles.skeletonNameLine]} />
            <View style={[styles.skeletonLine, styles.skeletonEmailLine]} />
          </View>

          <View style={styles.skeletonSection}>
            <View style={styles.skeletonSectionHeader}>
              <View style={[styles.skeletonLine, styles.skeletonSectionTitle]} />
              <View style={[styles.skeletonLine, styles.skeletonSectionLink]} />
            </View>

            <View style={styles.skeletonFieldGroup}>
              <View style={[styles.skeletonLine, styles.skeletonFieldLabel]} />
              <View style={styles.skeletonInput} />
            </View>

            <View style={styles.skeletonFieldGroup}>
              <View style={[styles.skeletonLine, styles.skeletonFieldLabel]} />
              <View style={styles.skeletonInput} />
            </View>
          </View>

          <View style={styles.skeletonSection}>
            <View style={styles.skeletonSectionHeader}>
              <View style={[styles.skeletonLine, styles.skeletonSectionTitle]} />
              <View style={[styles.skeletonLine, styles.skeletonSectionLink]} />
            </View>

            <View style={styles.skeletonFieldGroup}>
              <View style={[styles.skeletonLine, styles.skeletonFieldLabel]} />
              <View style={styles.skeletonInput} />
            </View>

            <View style={styles.skeletonFieldGroup}>
              <View style={[styles.skeletonLine, styles.skeletonFieldLabel]} />
              <View style={styles.skeletonInput} />
            </View>
          </View>

          <View style={styles.skeletonButton} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: scrollTopPadding, paddingBottom: scrollBottomPadding },
        ]}
      >
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} hitSlop={8}>
            <Feather name="menu" size={22} color="#1F2937" />
          </Pressable>
          <Text style={styles.topTitle}>Profile</Text>
          <Pressable style={styles.iconButton} hitSlop={8}>
            <Feather name="settings" size={22} color="#1F2937" />
          </Pressable>
        </View>

        {notice ? (
          <View
            style={[
              styles.noticeCard,
              notice.type === "success" ? styles.noticeSuccess : styles.noticeError,
            ]}
          >
            <Text
              style={[
                styles.noticeText,
                notice.type === "success" ? styles.noticeSuccessText : styles.noticeErrorText,
              ]}
            >
              {notice.message}
            </Text>
          </View>
        ) : null}

        {!hasProfile ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="person-circle-outline" size={46} color="#9AA4B2" />
            </View>
            <Text style={styles.emptyTitle}>Profil belum tersedia</Text>
            <Text style={styles.emptyDescription}>
              Data profil belum berhasil dimuat. Coba muat ulang atau periksa koneksi Anda.
            </Text>
            <Pressable
              style={[styles.primaryButton, isRefreshing && styles.buttonDisabled]}
              onPress={handleRefreshProfile}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Muat Ulang Profil</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatarWrapper}>
                {photoPreviewUri ? (
                  <Image source={{ uri: photoPreviewUri }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>{profileInitials}</Text>
                  </View>
                )}
                <Pressable style={styles.avatarAction} onPress={handlePickPhoto}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </Pressable>
              </View>
              <Text style={styles.profileName}>{user?.name ?? "-"}</Text>
              <Text style={styles.profileEmail}>{user?.email ?? "-"}</Text>
              <View style={styles.profileMetaRow}>
                <View style={styles.metaPill}>
                  <Ionicons name="briefcase-outline" size={14} color="#1D4ED8" />
                  <Text style={styles.metaLabel}>
                    {(user?.division?.name ?? "Divisi").toUpperCase()}
                  </Text>
                </View>
                <View style={styles.metaPill}>
                  <MaterialCommunityIcons name="office-building" size={14} color="#1D4ED8" />
                  <Text style={styles.metaLabel}>
                    {(user?.office_location?.name ?? "Kantor").toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Data Profil</Text>
                <Pressable onPress={handlePickPhoto} hitSlop={6}>
                  <Text style={styles.sectionLink}>Ganti Foto</Text>
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Nama Lengkap</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Nama lengkap"
                  placeholderTextColor="#94A3B8"
                  style={styles.input}
                />
              </View>
              {profileErrors.name ? (
                <Text style={styles.fieldError}>{profileErrors.name}</Text>
              ) : null}

              <Text style={[styles.fieldLabel, styles.fieldSpacing]}>Email</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="nama@email.com"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
              </View>
              {profileErrors.email ? (
                <Text style={styles.fieldError}>{profileErrors.email}</Text>
              ) : null}

              <Pressable
                style={[
                  styles.primaryButton,
                  (isSavingProfile || isRefreshing) && styles.buttonDisabled,
                ]}
                onPress={handleSaveProfile}
                disabled={isSavingProfile || isRefreshing}
              >
                {isSavingProfile ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Simpan Perubahan</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Keamanan</Text>
                {!isPasswordFormVisible ? (
                  <Pressable onPress={handleOpenPasswordForm} hitSlop={6}>
                    <Text style={styles.sectionLink}>Ubah Password</Text>
                  </Pressable>
                ) : null}
              </View>

              {!isPasswordFormVisible ? (
                <Text style={styles.securityHintText}>
                  Tekan "Ubah Password" untuk menampilkan form penggantian password.
                </Text>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>Password Saat Ini</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      value={passwordCurrent}
                      onChangeText={setPasswordCurrent}
                      placeholder="Masukkan password saat ini"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={hideCurrentPassword}
                      style={styles.input}
                    />
                    <Pressable
                      style={styles.inputIconButton}
                      onPress={() => setHideCurrentPassword((prev) => !prev)}
                    >
                      <Ionicons
                        name={hideCurrentPassword ? "eye-off" : "eye"}
                        size={18}
                        color="#64748B"
                      />
                    </Pressable>
                  </View>
                  {passwordErrors.current_password ? (
                    <Text style={styles.fieldError}>{passwordErrors.current_password}</Text>
                  ) : null}

                  <Text style={[styles.fieldLabel, styles.fieldSpacing]}>Password Baru</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      value={passwordNew}
                      onChangeText={setPasswordNew}
                      placeholder="Masukkan password baru"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={hideNewPassword}
                      style={styles.input}
                    />
                    <Pressable
                      style={styles.inputIconButton}
                      onPress={() => setHideNewPassword((prev) => !prev)}
                    >
                      <Ionicons
                        name={hideNewPassword ? "eye-off" : "eye"}
                        size={18}
                        color="#64748B"
                      />
                    </Pressable>
                  </View>
                  {passwordErrors.new_password ? (
                    <Text style={styles.fieldError}>{passwordErrors.new_password}</Text>
                  ) : null}

                  <Text style={[styles.fieldLabel, styles.fieldSpacing]}>
                    Konfirmasi Password Baru
                  </Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      value={passwordConfirm}
                      onChangeText={setPasswordConfirm}
                      placeholder="Ulangi password baru"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={hideConfirmPassword}
                      style={styles.input}
                    />
                    <Pressable
                      style={styles.inputIconButton}
                      onPress={() => setHideConfirmPassword((prev) => !prev)}
                    >
                      <Ionicons
                        name={hideConfirmPassword ? "eye-off" : "eye"}
                        size={18}
                        color="#64748B"
                      />
                    </Pressable>
                  </View>
                  {passwordErrors.new_password_confirmation ? (
                    <Text style={styles.fieldError}>
                      {passwordErrors.new_password_confirmation}
                    </Text>
                  ) : null}

                  <View style={styles.passwordActions}>
                    <Pressable
                      style={[styles.cancelButton, isSavingPassword && styles.buttonDisabled]}
                      onPress={handleCancelPasswordForm}
                      disabled={isSavingPassword}
                    >
                      <Text style={styles.cancelButtonText}>Batal</Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.secondaryButton,
                        styles.passwordSubmitButton,
                        isSavingPassword && styles.buttonDisabled,
                      ]}
                      onPress={handleUpdatePassword}
                      disabled={isSavingPassword}
                    >
                      {isSavingPassword ? (
                        <ActivityIndicator color="#0F5BD6" />
                      ) : (
                        <Text style={styles.secondaryButtonText}>Simpan Password</Text>
                      )}
                    </Pressable>
                  </View>
                </>
              )}
            </View>

            <Pressable style={styles.logoutCard} onPress={logout}>
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              <Text style={styles.logoutText}>Keluar</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <BottomNavbar
        activeTab="profile"
        navHeight={navHeight}
        navBottomPadding={navBottomPadding}
        onPressProfile={() => router.replace("/(app)/profile")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EEF0F3",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 18,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  topTitle: {
    ...typography.titlePage,
    color: "#111827",
  },
  noticeCard: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  noticeSuccess: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  noticeError: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  noticeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  noticeSuccessText: {
    color: "#166534",
  },
  noticeErrorText: {
    color: "#991B1B",
  },
  skeletonProfileCard: {
    backgroundColor: "#EBEEF2",
    borderRadius: 26,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 10,
  },
  skeletonAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#DEE3EA",
  },
  skeletonLine: {
    backgroundColor: "#DEE3EA",
    borderRadius: 999,
    height: 14,
  },
  skeletonNameLine: {
    width: 132,
    marginTop: 8,
  },
  skeletonEmailLine: {
    width: 98,
    height: 11,
  },
  skeletonSection: {
    backgroundColor: "#F0F2F6",
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 12,
  },
  skeletonSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skeletonSectionTitle: {
    width: 88,
    height: 12,
  },
  skeletonSectionLink: {
    width: 56,
    height: 11,
  },
  skeletonFieldGroup: {
    gap: 8,
  },
  skeletonFieldLabel: {
    width: 84,
    height: 10,
  },
  skeletonInput: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#DEE3EA",
  },
  skeletonButton: {
    height: 54,
    borderRadius: 18,
    backgroundColor: "#DEE3EA",
    marginTop: 4,
  },
  profileCard: {
    backgroundColor: "#F7F8FA",
    borderRadius: 26,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 8,
  },
  avatarWrapper: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarImage: {
    width: 124,
    height: 124,
    borderRadius: 62,
  },
  avatarFallback: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#CBD5F5",
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1E3A8A",
  },
  avatarAction: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#1D4ED8",
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginTop: 6,
  },
  profileEmail: {
    fontSize: 13,
    color: "#475569",
  },
  profileMetaRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#E6EDF8",
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E3A8A",
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  securityHintText: {
    ...typography.body,
    color: "#64748B",
    fontSize: 13,
    lineHeight: 19,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1F2937",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  fieldSpacing: {
    marginTop: 6,
  },
  inputWrapper: {
    position: "relative",
    backgroundColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  inputIconButton: {
    marginLeft: 8,
  },
  fieldError: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: -2,
  },
  primaryButton: {
    marginTop: spacing.s12,
    backgroundColor: "#0F5BD6",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButton: {
    marginTop: spacing.s12,
    backgroundColor: "#E2E8F0",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F5BD6",
  },
  passwordActions: {
    marginTop: spacing.s12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  passwordSubmitButton: {
    marginTop: 0,
    flex: 1,
  },
  cancelButton: {
    minWidth: 92,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  logoutCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptyDescription: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
});
