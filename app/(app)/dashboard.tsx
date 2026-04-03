import {
  Feather,
  FontAwesome6,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  isUnauthorizedError,
  mobileDashboardApi,
  normalizeApiError,
} from "../../src/lib/api";
import { useAuthStore } from "../../src/store/auth-store";
import type { DashboardState } from "../../src/types/state";
import {
  formatDurationFromMinutes,
  formatMinutePhrasesInText,
  formatSignedDurationFromMinutes,
} from "../../src/utils/duration";
import { buildLocationReadinessViewModel } from "../../src/utils/location-readiness";

type DashboardMode =
  | "not_checked_in_on_time"
  | "not_checked_in_late"
  | "checked_in_not_checked_out"
  | "checked_in_checked_out";

const initialState: DashboardState = {
  data: null,
  isLoading: true,
  isRefreshing: false,
  errorMessage: null,
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((state) => state.logout);
  const [state, setState] = useState<DashboardState>(initialState);
  const [now, setNow] = useState(() => new Date());
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboard = async (mode: "initial" | "refresh" = "initial") => {
    setState((prevState) => ({
      ...prevState,
      isLoading: mode === "initial",
      isRefreshing: mode === "refresh",
      errorMessage: null,
    }));

    try {
      const response = await mobileDashboardApi.fetchDashboard();

      setState({
        data: response.data,
        isLoading: false,
        isRefreshing: false,
        errorMessage: null,
      });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await logout();
        router.replace("/(auth)/login");
        return;
      }

      const apiError = normalizeApiError(error);
      setState((prevState) => ({
        ...prevState,
        isLoading: false,
        isRefreshing: false,
        errorMessage: apiError.message,
      }));
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, []);

  const handleRefresh = async () => {
    await fetchDashboard("refresh");
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  };

  const checkInAt = state.data?.today_status.check_in_at ?? null;
  const checkOutAt = state.data?.today_status.check_out_at ?? null;
  const shiftStart = parsePolicyTime(state.data?.policy.work_start_time ?? null, now);
  const lateToleranceMinutes = state.data?.policy.late_tolerance_minutes ?? 0;
  const threshold = shiftStart ? addMinutes(shiftStart, lateToleranceMinutes) : null;
  const isSessionRunning = Boolean(checkInAt) && !Boolean(checkOutAt);
  const sessionDuration = formatSessionDuration(checkInAt, now, isSessionRunning);
  const lateMinutes = calculateLateMinutes(shiftStart, now);
  const navBottomPadding = Math.max(insets.bottom, 8);
  const navHeight = 78 + navBottomPadding;
  const scrollTopPadding = Math.max(insets.top + 12, 20);
  const scrollBottomPadding = navHeight + 28;

  if (state.isLoading) {
    return (
      <View
        style={[
          styles.centered,
          { paddingTop: 24 + insets.top, paddingBottom: 24 + insets.bottom },
        ]}
      >
        <ActivityIndicator size="large" color="#1868D5" />
        <Text style={styles.loadingText}>Memuat dashboard absensi...</Text>
      </View>
    );
  }

  if (!state.data) {
    return (
      <View
        style={[
          styles.centered,
          { paddingTop: 24 + insets.top, paddingBottom: 24 + insets.bottom },
        ]}
      >
        <Text style={styles.errorTitle}>Dashboard gagal dimuat</Text>
        <Text style={styles.errorDescription}>
          {state.errorMessage ?? "Terjadi kesalahan yang tidak diketahui."}
        </Text>
        <Pressable style={styles.retryButton} onPress={() => void fetchDashboard()}>
          <Text style={styles.retryButtonText}>Coba lagi</Text>
        </Pressable>
      </View>
    );
  }

  const {
    user,
    today_status,
    action_state,
    policy,
    location_readiness,
    attendance_summary,
  } = state.data;

  const hasCheckIn = Boolean(today_status.check_in_at);
  const hasCheckOut = Boolean(today_status.check_out_at);

  const dashboardMode: DashboardMode = hasCheckIn && !hasCheckOut
    ? "checked_in_not_checked_out"
    : hasCheckIn && hasCheckOut
      ? "checked_in_checked_out"
      : threshold && now.getTime() > threshold.getTime()
        ? "not_checked_in_late"
        : "not_checked_in_on_time";

  const isLate = dashboardMode === "not_checked_in_late";
  const isCheckedIn = dashboardMode === "checked_in_not_checked_out";
  const isCheckedOut = dashboardMode === "checked_in_checked_out";
  const hasCheckedInToday = isCheckedIn || isCheckedOut;
  const locationReadinessView = buildLocationReadinessViewModel(location_readiness);

  const gpsCardTitle = isLate ? "VALIDASI GPS" : "STATUS GPS";
  const gpsCardValue = locationReadinessView.gpsValue;
  const gpsCardAccent = locationReadinessView.gpsAccent;
  const gpsIconColor = gpsCardAccent === "green" ? "#027A30" : "#6B7280";

  const secondCardTitle = "ZONA LOKASI";
  const secondCardValue = locationReadinessView.zoneValue;
  const secondCardAccent = locationReadinessView.zoneAccent;
  const secondIconColor = secondCardAccent === "green" ? "#027A30" : "#6B7280";

  const ctaLabel = isCheckedIn
    ? "Pindai QR untuk Absen Pulang"
    : "Pindai QR untuk Absen Masuk";
  const ctaStyle = isLate ? styles.ctaLate : styles.ctaPrimary;
  const statusPillText = isCheckedIn
    ? "SUDAH ABSEN"
    : isCheckedOut
      ? "SUDAH CHECK-OUT"
    : isLate
      ? "TERLAMBAT"
      : "TEPAT WAKTU";
  const statusText = isCheckedIn
    ? "SUDAH ABSEN MASUK"
    : isCheckedOut
      ? "SUDAH CHECK-OUT"
      : "BELUM ABSEN";
  const summaryAvgStart = attendance_summary.avg_start?.time ?? "--:--";
  const summaryAvgDeltaMinutes = attendance_summary.avg_start?.delta_from_shift_start_minutes ?? null;
  const summaryWeekHours = attendance_summary.this_week?.total_hours ?? 0;
  const summaryRecentActivity = attendance_summary.recent_activity?.length
    ? attendance_summary.recent_activity.slice(0, 2).map((activity) => ({
        label: activity.label ?? "-",
        title: activity.title ?? "Aktivitas",
        type: (activity.type ?? "clock_in") as "clock_in" | "clock_out",
        at: activity.at,
      }))
    : buildRecentActivityFallback(state.data.recent_attendances);
  const summaryInsightMessage = formatMinutePhrasesInText(
    attendance_summary.insight?.message
      ?? "Insight ringkasan akan muncul setelah data absensi Anda mencukupi.",
  );
  const summaryInsightType = attendance_summary.insight?.type ?? "neutral";

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: scrollTopPadding, paddingBottom: scrollBottomPadding },
        ]}
        refreshControl={
          <RefreshControl refreshing={state.isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topHeader}>
          {hasCheckedInToday ? (
            <>
              <View style={styles.profileHeaderLeft}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={22} color="#16223A" />
                </View>
                <Text style={styles.appTitle}>FlowHR</Text>
              </View>
              <Pressable hitSlop={8}>
                <Ionicons name="notifications" size={24} color="#6F7787" />
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.appTitle}>FlowHR</Text>
              <Pressable
                onLongPress={() => void handleLogout()}
                disabled={isLoggingOut}
                style={styles.avatarCircle}
              >
                {isLoggingOut ? (
                  <ActivityIndicator color="#1868D5" />
                ) : (
                  <Ionicons name="person" size={22} color="#16223A" />
                )}
              </Pressable>
            </>
          )}
        </View>

        {hasCheckedInToday ? (
          <View style={styles.checkedInMetaRow}>
            <View style={styles.checkedInPill}>
              <View style={styles.statusDotGreen} />
              <Text style={styles.checkedInPillText}>{statusPillText}</Text>
            </View>
            <Text style={styles.dateText}>{formatWeekdayDate(today_status.date)}</Text>
          </View>
        ) : (
          <View style={styles.overviewBlock}>
            {!isLate ? (
              <>
                <Text style={styles.overviewLabel}>RINGKASAN HARI INI</Text>
                <Text style={styles.greetingTitle}>{getGreeting(now)}</Text>
              </>
            ) : (
              <View style={styles.statusLocationRow}>
                <View style={styles.statusLocationCol}>
                  <Text style={styles.overviewLabel}>STATUS</Text>
                  <View style={styles.rowInline}>
                    <View style={styles.statusDotRed} />
                    <Text style={styles.statusDangerText}>{statusText}</Text>
                  </View>
                </View>
                <View style={[styles.statusLocationCol, styles.alignRight]}>
                  <Text style={styles.overviewLabel}>LOKASI</Text>
                  <View style={styles.rowInline}>
                    <Ionicons name="checkmark-circle" size={20} color="#027A30" />
                    <Text style={styles.locationText}>
                      {(user.office_location_name ?? "KANTOR UTAMA").toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {isCheckedIn ? (
          <View style={styles.mainCard}>
            <Text style={styles.sessionLabel}>SESI BERJALAN</Text>
            <View style={styles.sessionRow}>
              <Text style={styles.sessionTimer}>{sessionDuration}</Text>
              <View style={styles.clockCircle}>
                <Feather name="clock" size={36} color="#C7CBD2" />
              </View>
            </View>
            <View style={styles.sessionStartRow}>
              <Ionicons name="log-in-outline" size={22} color="#027A30" />
              <Text style={styles.sessionStartText}>
                Jam kerja dimulai pada{" "}
                <Text style={styles.sessionStartBold}>
                  {formatClock(today_status.check_in_at)}
                </Text>
              </Text>
            </View>
          </View>
        ) : isCheckedOut ? (
          <View style={styles.mainCard}>
            <Text style={styles.sessionLabel}>SESI HARI INI SELESAI</Text>
            <View style={styles.sessionStartRow}>
              <Ionicons name="log-in-outline" size={22} color="#027A30" />
              <Text style={styles.sessionStartText}>
                Absen masuk pada{" "}
                <Text style={styles.sessionStartBold}>
                  {formatClock(today_status.check_in_at)}
                </Text>
              </Text>
            </View>
            <View style={styles.sessionStartRow}>
              <Ionicons name="log-out-outline" size={22} color="#1868D5" />
              <Text style={styles.sessionStartText}>
                Absen pulang pada{" "}
                <Text style={styles.sessionStartBold}>
                  {formatClock(today_status.check_out_at)}
                </Text>
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.mainCard}>
            <View style={styles.statusCardHeader}>
              <View style={styles.rowInline}>
                <View style={isLate ? styles.statusDotRed : styles.statusDotBlue} />
                <Text style={isLate ? styles.statusDangerText : styles.statusPrimaryText}>
                  STATUS: {statusText}
                </Text>
              </View>
              <View style={isLate ? styles.badgeLate : styles.badgeOnTime}>
                <Text style={isLate ? styles.badgeLateText : styles.badgeOnTimeText}>
                  {statusPillText}
                </Text>
              </View>
            </View>
            <Text style={styles.currentTimeLabel}>Waktu Saat Ini</Text>
            <Text style={styles.currentTimeValue}>{formatClock(now)}</Text>

            {isLate ? (
              <View style={styles.lateBanner}>
                <Ionicons name="warning" size={20} color="#C01616" />
                <Text style={styles.lateBannerText}>
                  Anda terlambat {formatDurationFromMinutes(lateMinutes)}
                </Text>
              </View>
            ) : null}

            <View style={styles.divider} />
            <View style={styles.shiftRow}>
              <View>
                <Text style={styles.shiftLabel}>MULAI SHIFT</Text>
                <Text style={styles.shiftValue}>{formatClock(shiftStart)}</Text>
              </View>
              <View style={styles.shiftSeparator} />
              <View>
                <Text style={styles.shiftLabel}>
                  {isLate ? "BATAS" : "BATAS WAKTU"}
                </Text>
                <Text style={styles.shiftValue}>{formatClock(threshold)}</Text>
              </View>
            </View>
          </View>
        )}

        {hasCheckedInToday ? (
          <>
            <View style={styles.duoCardsRow}>
              <StatusInfoCard
                icon={
                  <MaterialCommunityIcons
                    name="crosshairs-gps"
                    size={28}
                    color={gpsIconColor}
                  />
                }
                title={gpsCardTitle}
                value={gpsCardValue}
                accent={gpsCardAccent}
              />
              <StatusInfoCard
                icon={<Ionicons name="location" size={24} color={secondIconColor} />}
                title={secondCardTitle}
                value={secondCardValue}
                accent={secondCardAccent}
              />
            </View>
            {isCheckedIn ? (
              <Pressable style={[styles.ctaButton, ctaStyle]}>
                <MaterialCommunityIcons name="qrcode-scan" size={28} color="#FFFFFF" />
                <Text style={styles.ctaText}>{ctaLabel}</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <Pressable style={[styles.ctaButton, ctaStyle]}>
              <MaterialCommunityIcons name="qrcode-scan" size={28} color="#FFFFFF" />
              <Text style={styles.ctaText}>{ctaLabel}</Text>
            </Pressable>
            <View style={styles.duoCardsRow}>
              <StatusInfoCard
                icon={
                  <MaterialCommunityIcons
                    name={isLate ? "map-marker-radius" : "crosshairs-gps"}
                    size={28}
                    color={gpsIconColor}
                  />
                }
                title={gpsCardTitle}
                value={gpsCardValue}
                accent={gpsCardAccent}
              />
              <StatusInfoCard
                icon={
                  isLate ? (
                    <Ionicons name="wifi" size={24} color={secondIconColor} />
                  ) : (
                    <Ionicons name="radio-outline" size={24} color={secondIconColor} />
                  )
                }
                title={secondCardTitle}
                value={secondCardValue}
                accent={secondCardAccent}
              />
            </View>
          </>
        )}

        {hasCheckedInToday ? (
          <View style={styles.timelineSection}>
            <Text style={styles.timelineTitle}>TIMELINE HARI INI</Text>
            <View style={styles.timelineCardsRow}>
              <View style={styles.timelineCard}>
                <Text style={styles.timelineLabel}>CHECK-IN</Text>
                <Text style={styles.timelineTime}>{formatClock(today_status.check_in_at)}</Text>
                <View style={styles.timelineBadge}>
                  <Text style={styles.timelineBadgeText}>
                    {today_status.is_late ? "TERLAMBAT" : "TEPAT WAKTU"}
                  </Text>
                </View>
              </View>
              <View style={styles.timelineCard}>
                <Text style={styles.timelineLabel}>
                  {isCheckedOut ? "CHECK-OUT" : "PERKIRAAN PULANG"}
                </Text>
                <Text style={isCheckedOut ? styles.timelineTime : styles.timelineTimeMuted}>
                  {isCheckedOut
                    ? formatClock(today_status.check_out_at)
                    : formatClock(parsePolicyTime(policy.work_end_time, now))}
                </Text>
                {isCheckedOut ? (
                  <View style={styles.timelineBadge}>
                    <Text style={styles.timelineBadgeText}>SELESAI</Text>
                  </View>
                ) : (
                  <Ionicons name="lock-closed" size={18} color="#8B909C" />
                )}
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.attendanceSummaryCard}>
          <Text style={styles.attendanceSummaryTitle}>Ringkasan Absensi</Text>

          <View style={styles.attendanceSummaryStatRow}>
            <View style={styles.attendanceSummaryStatBox}>
              <Text style={styles.attendanceSummaryStatLabel}>RATA-RATA MASUK</Text>
              <View style={styles.attendanceSummaryStatValueRow}>
                <Text style={styles.attendanceSummaryStatValue}>{summaryAvgStart}</Text>
                {summaryAvgDeltaMinutes !== null ? (
                  <Text
                    style={[
                      styles.attendanceSummaryDelta,
                      summaryAvgDeltaMinutes <= 0
                        ? styles.attendanceSummaryDeltaGood
                        : styles.attendanceSummaryDeltaWarn,
                    ]}
                  >
                    {formatDeltaMinutes(summaryAvgDeltaMinutes)}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.attendanceSummaryStatBox}>
              <Text style={styles.attendanceSummaryStatLabel}>MINGGU INI</Text>
              <View style={styles.attendanceSummaryStatValueRow}>
                <Text style={styles.attendanceSummaryStatValue}>
                  {formatWeekHours(summaryWeekHours)}
                </Text>
                <Text style={styles.attendanceSummaryHoursSuffix}>JAM</Text>
              </View>
            </View>
          </View>

          <View style={styles.attendanceSummaryRecentHeader}>
            <Text style={styles.attendanceSummaryRecentTitle}>AKTIVITAS TERBARU</Text>
            <Text style={styles.attendanceSummaryRecentLink}>Lihat History</Text>
          </View>

          {summaryRecentActivity.length > 0 ? (
            <View style={styles.attendanceSummaryActivityList}>
              {summaryRecentActivity.map((activity, index) => (
                <View key={`${activity.type}-${activity.at ?? index}`} style={styles.activityRow}>
                  <View style={styles.activityLeft}>
                    <View style={styles.activityIconCircle}>
                      <Ionicons
                        name={activity.type === "clock_out" ? "log-out-outline" : "log-in-outline"}
                        size={15}
                        color="#6B7280"
                      />
                    </View>
                    <View>
                      <Text style={styles.activityLabel}>{activity.label}</Text>
                      <Text style={styles.activityTitle}>{activity.title}</Text>
                    </View>
                  </View>
                  <Text style={styles.activityTime}>{formatClock(activity.at)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.attendanceSummaryEmpty}>
              Aktivitas absensi terbaru belum tersedia.
            </Text>
          )}

          <View
            style={[
              styles.attendanceInsightBanner,
              summaryInsightType === "ahead"
                ? styles.attendanceInsightAhead
                : summaryInsightType === "behind"
                  ? styles.attendanceInsightBehind
                  : styles.attendanceInsightNeutral,
            ]}
          >
            <View style={styles.attendanceInsightIconCircle}>
              <Ionicons name="bulb" size={16} color="#7A5A00" />
            </View>
            <Text style={styles.attendanceInsightText}>{summaryInsightMessage}</Text>
          </View>
        </View>

        <View style={[styles.policyCard, isLate && styles.policyCardLate]}>
          <View style={[styles.policyIcon, isLate && styles.policyIconLate]}>
            <Ionicons name="information" size={22} color="#FFFFFF" />
          </View>
          <View style={styles.policyTextWrap}>
            <Text style={styles.policyTitle}>
              {isCheckedIn ? "Kebijakan Absensi Aktif" : "Kebijakan Absensi"}
            </Text>
            <Text style={styles.policyDescription}>
              {buildPolicyMessage({
                isLate,
                isCheckedIn,
                isCheckedOut,
                shiftStart,
                threshold,
                lateToleranceMinutes: policy.late_tolerance_minutes ?? 0,
              })}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomNav, { height: navHeight, paddingBottom: navBottomPadding }]}>
        <BottomNavItem
          icon={<Ionicons name="home" size={28} color="#1D64D7" />}
          label="DASHBOARD"
          active
        />
        <BottomNavItem
          icon={<MaterialCommunityIcons name="history" size={26} color="#7A828F" />}
          label="HISTORY"
          onPress={() => router.replace("/(app)/history")}
        />
        <BottomNavItem
          icon={<Ionicons name="calendar-outline" size={26} color="#7A828F" />}
          label="CUTI"
        />
        <BottomNavItem
          icon={<FontAwesome6 name="user" size={22} color="#7A828F" />}
          label="PROFIL"
        />
      </View>
    </View>
  );
}

function StatusInfoCard({
  icon,
  title,
  value,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  accent: "green" | "neutral";
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoCardTop}>
        <View style={styles.infoIconCircle}>{icon}</View>
        <View
          style={[
            styles.infoDot,
            accent === "green" ? styles.infoDotGreen : styles.infoDotGray,
          ]}
        />
      </View>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function BottomNavItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <View style={styles.navItemWrapper}>
      <Pressable
        style={[styles.navItem, active && styles.navItemActive]}
        onPress={onPress}
        disabled={!onPress}
      >
        {icon}
        <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
      </Pressable>
    </View>
  );
}

function buildRecentActivityFallback(
  recentAttendances: Array<{
    work_date: string | null;
    check_in_at: string | null;
    check_out_at: string | null;
  }>,
): Array<{
  label: string;
  title: string;
  type: "clock_in" | "clock_out";
  at: string | null;
}> {
  const items: Array<{
    label: string;
    title: string;
    type: "clock_in" | "clock_out";
    at: string | null;
  }> = [];

  for (const attendance of recentAttendances) {
    const dayLabel = resolveRelativeDayLabel(attendance.work_date);

    if (attendance.check_in_at) {
      items.push({
        label: dayLabel,
        title: "Absen Masuk",
        type: "clock_in",
        at: attendance.check_in_at,
      });
    }

    if (attendance.check_out_at) {
      items.push({
        label: dayLabel,
        title: "Absen Pulang",
        type: "clock_out",
        at: attendance.check_out_at,
      });
    }

    if (items.length >= 2) {
      break;
    }
  }

  return items.slice(0, 2);
}

function resolveRelativeDayLabel(workDate: string | null): string {
  if (!workDate) {
    return "-";
  }

  const targetDate = parseDateLike(workDate);
  if (!targetDate) {
    return workDate;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const candidate = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  );

  if (candidate.getTime() === today.getTime()) {
    return "Hari Ini";
  }

  if (candidate.getTime() === yesterday.getTime()) {
    return "Kemarin";
  }

  return targetDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDeltaMinutes(value: number): string {
  return `(${formatSignedDurationFromMinutes(value)})`;
}

function formatWeekHours(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return safeValue.toFixed(1);
}

function parsePolicyTime(time: string | null, anchor: Date): Date | null {
  if (!time) {
    return null;
  }

  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim());
  if (!match) {
    return null;
  }

  const date = new Date(anchor);
  date.setHours(Number(match[1]), Number(match[2]), Number(match[3] ?? 0), 0);
  return date;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function formatClock(value: Date | string | null): string {
  if (!value) {
    return "--:--";
  }

  const date = parseDateLike(value);
  if (!date) {
    return "--:--";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatWeekdayDate(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = parseDateLike(value);
  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatSessionDuration(
  checkInAt: string | null,
  now: Date,
  isSessionRunning: boolean,
): string {
  if (!checkInAt || !isSessionRunning) {
    return "00:00:00";
  }

  const start = parseDateLike(checkInAt);
  if (!start) {
    return "00:00:00";
  }

  const durationMs = Math.max(0, now.getTime() - start.getTime());
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function parseDateLike(value: Date | string | null): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const rawValue = value.trim();
  if (!rawValue) {
    return null;
  }

  const nativeDate = new Date(rawValue);
  if (!Number.isNaN(nativeDate.getTime())) {
    return nativeDate;
  }

  const normalizedDate = new Date(rawValue.replace(" ", "T"));
  if (!Number.isNaN(normalizedDate.getTime())) {
    return normalizedDate;
  }

  const fallbackMatch =
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(rawValue);

  if (!fallbackMatch) {
    return null;
  }

  const [, year, month, day, hour = "0", minute = "0", second = "0"] = fallbackMatch;
  const parsedDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    0,
  );

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function calculateLateMinutes(shiftStart: Date | null, now: Date): number {
  if (!shiftStart) {
    return 0;
  }

  const diffMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / 60000);
  return Math.max(0, diffMinutes);
}

function getGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) {
    return "Selamat Pagi.";
  }
  if (hour < 18) {
    return "Selamat Siang.";
  }
  return "Selamat Malam.";
}

function buildPolicyMessage({
  isLate,
  isCheckedIn,
  isCheckedOut,
  shiftStart,
  threshold,
  lateToleranceMinutes,
}: {
  isLate: boolean;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  shiftStart: Date | null;
  threshold: Date | null;
  lateToleranceMinutes: number;
}): string {
  if (isLate) {
    return `Absen masuk setelah ${formatClock(
      threshold,
    )} mengharuskan alasan keterlambatan saat proses absen masuk.`;
  }

  if (isCheckedIn) {
    return `Masa toleransi adalah ${formatDurationFromMinutes(
      lateToleranceMinutes,
    )} dari jam mulai shift ${formatClock(shiftStart)}. Anda saat ini berada di zona absensi yang ditentukan.`;
  }

  if (isCheckedOut) {
    return "Absen masuk dan absen pulang hari ini sudah tercatat. Anda dapat meninjau detailnya di menu history.";
  }

  return `Masa toleransi ${formatDurationFromMinutes(
    lateToleranceMinutes,
  )} diterapkan. Absen masuk setelah ${formatClock(
    threshold,
  )} akan ditandai sebagai absensi terlambat.`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EEF0F3",
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 132,
    gap: 14,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
    backgroundColor: "#EEF0F3",
  },
  loadingText: {
    fontSize: 14,
    color: "#374151",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9F1239",
  },
  errorDescription: {
    textAlign: "center",
    color: "#475569",
  },
  retryButton: {
    marginTop: 6,
    backgroundColor: "#1868D5",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0E1422",
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "#C5D1E7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9EEF7",
  },
  overviewBlock: {
    gap: 8,
  },
  overviewLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  greetingTitle: {
    fontSize: 38,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: "#0D141D",
  },
  checkedInMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  checkedInPill: {
    backgroundColor: "#CFEED7",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkedInPillText: {
    color: "#03662E",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 1.4,
  },
  dateText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "500",
  },
  statusLocationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  statusLocationCol: {
    gap: 8,
  },
  alignRight: {
    alignItems: "flex-end",
  },
  rowInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDotBlue: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#6AA0EE",
  },
  statusDotRed: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: "#CD1E1E",
    shadowColor: "#CD1E1E",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statusDotGreen: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#027A30",
  },
  statusPrimaryText: {
    color: "#0B4FAF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  statusDangerText: {
    color: "#BE1010",
    fontSize: 14,
    fontWeight: "800",
  },
  locationText: {
    color: "#027A30",
    fontSize: 13,
    fontWeight: "800",
  },
  mainCard: {
    borderRadius: 22,
    backgroundColor: "#F7F8FA",
    padding: 18,
    gap: 8,
  },
  statusCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgeOnTime: {
    borderRadius: 999,
    backgroundColor: "#CAD7F3",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  badgeOnTimeText: {
    color: "#18488D",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  badgeLate: {
    borderRadius: 999,
    backgroundColor: "#FDD7D1",
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  badgeLateText: {
    color: "#B71D1D",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  currentTimeLabel: {
    fontSize: 17,
    color: "#2E3643",
    marginTop: 2,
  },
  currentTimeValue: {
    fontSize: 64,
    lineHeight: 70,
    color: "#0E141B",
    fontWeight: "900",
    letterSpacing: -1.2,
  },
  lateBanner: {
    borderRadius: 999,
    backgroundColor: "#FFD8D2",
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    alignSelf: "center",
    marginTop: 4,
  },
  lateBannerText: {
    color: "#A51717",
    fontSize: 15,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#D8DCE3",
    marginTop: 14,
    marginBottom: 6,
  },
  shiftRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  shiftSeparator: {
    width: 1,
    height: 48,
    backgroundColor: "#D8DCE3",
  },
  shiftLabel: {
    fontSize: 12,
    color: "#3C4654",
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  shiftValue: {
    color: "#0D141D",
    fontSize: 18,
    fontWeight: "800",
  },
  sessionLabel: {
    fontSize: 13,
    color: "#2F3846",
    fontWeight: "800",
    letterSpacing: 2,
  },
  sessionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionTimer: {
    fontSize: 56,
    lineHeight: 62,
    color: "#0D141D",
    fontWeight: "900",
    letterSpacing: -1.2,
  },
  clockCircle: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: "#DCDDE0",
    alignItems: "center",
    justifyContent: "center",
  },
  sessionStartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionStartText: {
    fontSize: 16,
    color: "#2B3545",
  },
  sessionStartBold: {
    fontWeight: "800",
    color: "#111827",
  },
  ctaButton: {
    borderRadius: 24,
    minHeight: 62,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#1D64D7",
    shadowOpacity: 0.23,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  ctaPrimary: {
    backgroundColor: "#1868D5",
  },
  ctaLate: {
    backgroundColor: "#F39200",
    shadowColor: "#F39200",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  duoCardsRow: {
    flexDirection: "row",
    gap: 12,
  },
  infoCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#E8EAEE",
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 126,
  },
  infoCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  infoIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#C6EFD4",
    alignItems: "center",
    justifyContent: "center",
  },
  infoDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    marginTop: 4,
  },
  infoDotGreen: {
    backgroundColor: "#74E58B",
  },
  infoDotGray: {
    backgroundColor: "#B1B6C0",
  },
  infoTitle: {
    color: "#2F3846",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  infoValue: {
    color: "#0E141D",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
  },
  timelineSection: {
    gap: 12,
  },
  timelineTitle: {
    color: "#313A49",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.6,
  },
  timelineCardsRow: {
    flexDirection: "row",
    gap: 12,
  },
  timelineCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#E8EAEE",
    padding: 14,
    minHeight: 120,
    justifyContent: "space-between",
  },
  timelineLabel: {
    color: "#2F3846",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  timelineTime: {
    color: "#0E141D",
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
  },
  timelineTimeMuted: {
    color: "#6D737E",
    fontSize: 22,
    fontWeight: "800",
  },
  timelineBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#CAE7D3",
  },
  timelineBadgeText: {
    color: "#067032",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  attendanceSummaryCard: {
    borderRadius: 18,
    backgroundColor: "#F2F3F6",
    padding: 14,
    gap: 12,
  },
  attendanceSummaryTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#161E2B",
  },
  attendanceSummaryStatRow: {
    flexDirection: "row",
    gap: 10,
  },
  attendanceSummaryStatBox: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#E4E6EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 80,
    justifyContent: "center",
    gap: 6,
  },
  attendanceSummaryStatLabel: {
    color: "#8A919E",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  attendanceSummaryStatValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "wrap",
  },
  attendanceSummaryStatValue: {
    color: "#111827",
    fontSize: 34,
    lineHeight: 36,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  attendanceSummaryDelta: {
    fontSize: 12,
    fontWeight: "700",
  },
  attendanceSummaryDeltaGood: {
    color: "#14803C",
  },
  attendanceSummaryDeltaWarn: {
    color: "#B45309",
  },
  attendanceSummaryHoursSuffix: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  attendanceSummaryRecentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  attendanceSummaryRecentTitle: {
    color: "#8A919E",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  attendanceSummaryRecentLink: {
    color: "#1D64D7",
    fontSize: 12,
    fontWeight: "700",
  },
  attendanceSummaryActivityList: {
    gap: 8,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  activityIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: "#DBDEE4",
    alignItems: "center",
    justifyContent: "center",
  },
  activityLabel: {
    color: "#1F2937",
    fontSize: 15,
    fontWeight: "700",
  },
  activityTitle: {
    color: "#7B8391",
    fontSize: 12,
    marginTop: 2,
  },
  activityTime: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
  attendanceSummaryEmpty: {
    color: "#6B7280",
    fontSize: 13,
  },
  attendanceInsightBanner: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  attendanceInsightAhead: {
    backgroundColor: "#F5D98F",
  },
  attendanceInsightBehind: {
    backgroundColor: "#FDE1B3",
  },
  attendanceInsightNeutral: {
    backgroundColor: "#E8DCC0",
  },
  attendanceInsightIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#A98300",
    alignItems: "center",
    justifyContent: "center",
  },
  attendanceInsightText: {
    flex: 1,
    color: "#6B4F00",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  policyCard: {
    borderRadius: 16,
    backgroundColor: "#E8EAEE",
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  policyCardLate: {
    backgroundColor: "#F4EAD5",
    borderLeftWidth: 5,
    borderLeftColor: "#F39200",
  },
  policyIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#1A67D3",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  policyIconLate: {
    backgroundColor: "#F39200",
  },
  policyTextWrap: {
    flex: 1,
    gap: 4,
  },
  policyTitle: {
    color: "#1D2431",
    fontSize: 15,
    fontWeight: "800",
  },
  policyDescription: {
    color: "#4A5361",
    fontSize: 13,
    lineHeight: 20,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 86,
    backgroundColor: "#F5F6F8",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  navItemWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 20,
    width: 82,
    height: 64,
  },
  navItemActive: {
    backgroundColor: "#DCE8FB",
    shadowColor: "#1D64D7",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  } as ViewStyle,
  navLabel: {
    fontSize: 12,
    color: "#6C7482",
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  navLabelActive: {
    color: "#1D64D7",
  },
});

