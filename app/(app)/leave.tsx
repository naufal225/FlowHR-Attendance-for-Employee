import {
  Feather,
  FontAwesome6,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  isUnauthorizedError,
  mobileLeaveApi,
  normalizeApiError,
} from "../../src/lib/api";
import { useAuthStore } from "../../src/store/auth-store";
import type {
  MobileLeavePageHistoryItem,
  MobileLeavePageLeaveItem,
  MobileLeavePagePayload,
} from "../../src/types/api";
import type { LeaveState } from "../../src/types/state";

type LeaveCalendarEntry = {
  id: number;
  statusLabel: string | null;
  dateStart: string;
  dateEnd: string;
  reason: string | null;
};

type CalendarCell = {
  key: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasLeave: boolean;
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const initialState: LeaveState = {
  data: null,
  isLoading: true,
  isRefreshing: false,
  errorMessage: null,
};

export default function LeaveScreen() {
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((state) => state.logout);
  const [state, setState] = useState<LeaveState>(initialState);
  const [displayMonth, setDisplayMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const monthInitializedRef = useRef(false);

  const navBottomPadding = Math.max(insets.bottom, 10);
  const navHeight = 82 + navBottomPadding;
  const screenTopPadding = Math.max(insets.top + 12, 24);

  const fetchLeavePage = async (mode: "initial" | "refresh" = "initial") => {
    setState((previous) => ({
      ...previous,
      isLoading: mode === "initial",
      isRefreshing: mode === "refresh",
      errorMessage: null,
    }));

    try {
      const response = await mobileLeaveApi.fetchLeavePage({ page: 1, perPage: 50 });

      setState({
        data: response.data,
        isLoading: false,
        isRefreshing: false,
        errorMessage: null,
      });

      if (!monthInitializedRef.current) {
        const todayDate = parseDateOnly(response.data.today_context.date) ?? new Date();
        setDisplayMonth(startOfMonth(todayDate));
        monthInitializedRef.current = true;
      }
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await logout();
        router.replace("/(auth)/login");
        return;
      }

      const apiError = normalizeApiError(error);
      setState((previous) => ({
        ...previous,
        isLoading: false,
        isRefreshing: false,
        errorMessage: apiError.message,
      }));
    }
  };

  useEffect(() => {
    void fetchLeavePage();
  }, []);

  const leaveEntries = useMemo(
    () => collectLeaveEntries(state.data),
    [state.data],
  );

  const leaveByDate = useMemo(() => buildLeaveDateMap(leaveEntries), [leaveEntries]);

  const todayKey = state.data?.today_context.date ?? toDateKey(new Date());
  const calendarCells = useMemo(
    () =>
      buildCalendarCells({
        month: displayMonth,
        selectedDateKey,
        todayKey,
        leaveByDate,
      }),
    [displayMonth, leaveByDate, selectedDateKey, todayKey],
  );

  const selectedLeave = selectedDateKey ? (leaveByDate.get(selectedDateKey) ?? null) : null;

  if (state.isLoading && !state.data) {
    return (
      <View
        style={[
          styles.centered,
          { paddingTop: 24 + insets.top, paddingBottom: 24 + insets.bottom },
        ]}
      >
        <ActivityIndicator size="large" color="#1D64D7" />
        <Text style={styles.loadingText}>Memuat data cuti...</Text>
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
        <Text style={styles.errorTitle}>Halaman cuti gagal dimuat.</Text>
        <Text style={styles.errorMessage}>
          {state.errorMessage ?? "Terjadi kesalahan yang tidak diketahui."}
        </Text>
        <Pressable style={styles.retryButton} onPress={() => void fetchLeavePage()}>
          <Text style={styles.retryButtonText}>Coba lagi</Text>
        </Pressable>
      </View>
    );
  }

  const isOnLeaveToday = state.data.today_context.attendance_status === "on_leave";
  const statusTitle = isOnLeaveToday
    ? (state.data.today_context.attendance_status_label ?? "Sedang Cuti")
    : "Masuk Kerja";
  const statusNote = isOnLeaveToday
    ? (state.data.today_context.attendance_note ?? "Anda tidak perlu check-in hari ini.")
    : "Selamat bekerja, jangan lupa check-in hari ini.";

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: screenTopPadding, paddingBottom: navHeight + 26 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={state.isRefreshing}
            onRefresh={() => void fetchLeavePage("refresh")}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.menuButton} hitSlop={8}>
            <Feather name="menu" size={26} color="#121620" />
          </Pressable>
          <Text style={styles.headerTitle}>Cuti</Text>
          <View style={styles.menuButtonSpacer} />
        </View>

        <View style={isOnLeaveToday ? styles.todayCardLeave : styles.todayCardWorking}>
          <View style={isOnLeaveToday ? styles.todayIconWrapLeave : styles.todayIconWrapWorking}>
            {isOnLeaveToday ? (
              <Ionicons name="calendar-outline" size={30} color="#FFFFFF" />
            ) : (
              <Ionicons name="briefcase" size={20} color="#0D7F3D" />
            )}
          </View>
          <View style={styles.todayTextWrap}>
            <Text style={isOnLeaveToday ? styles.todayLabelLeave : styles.todayLabelWorking}>
              Status Hari Ini
            </Text>
            <Text style={isOnLeaveToday ? styles.todayValueLeave : styles.todayValueWorking}>
              {statusTitle}
            </Text>
            <Text style={isOnLeaveToday ? styles.todayNoteLeave : styles.todayNoteWorking}>
              {statusNote}
            </Text>
          </View>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Text style={styles.calendarMonthText}>{formatMonthYear(displayMonth)}</Text>
            <View style={styles.calendarNavRow}>
              <Pressable
                style={styles.calendarNavButton}
                onPress={() => {
                  setDisplayMonth((current) => addMonths(current, -1));
                  setSelectedDateKey(null);
                }}
              >
                <Feather name="chevron-left" size={20} color="#636B79" />
              </Pressable>
              <Pressable
                style={styles.calendarNavButton}
                onPress={() => {
                  setDisplayMonth((current) => addMonths(current, 1));
                  setSelectedDateKey(null);
                }}
              >
                <Feather name="chevron-right" size={20} color="#636B79" />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.weekdayLabel}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarCells.map((cell) => (
              <Pressable
                key={cell.key}
                style={styles.dayCell}
                onPress={() => setSelectedDateKey(cell.key)}
              >
                <View
                  style={[
                    styles.dayNumberWrap,
                    cell.isSelected && styles.dayNumberWrapSelected,
                    !cell.isSelected && cell.isToday && styles.dayNumberWrapToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumberText,
                      !cell.isCurrentMonth && styles.dayNumberTextMuted,
                      cell.isSelected && styles.dayNumberTextSelected,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </View>
                <View style={styles.dotSlot}>
                  {cell.hasLeave ? <View style={styles.leaveDot} /> : null}
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {selectedDateKey && selectedLeave ? (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Detail Cuti</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tanggal Dipilih</Text>
              <Text style={styles.detailValue}>{formatDateFromKey(selectedDateKey)}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Periode Cuti</Text>
              <Text style={styles.detailValue}>
                {formatDateKey(selectedLeave.dateStart)} - {formatDateKey(selectedLeave.dateEnd)}
              </Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Alasan</Text>
              <Text style={styles.detailReason}>{selectedLeave.reason ?? "-"}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.bottomNav, { height: navHeight, paddingBottom: navBottomPadding }]}>
        <BottomNavItem
          icon={<Ionicons name="home" size={24} color="#7A828F" />}
          label="HOME"
          onPress={() => router.replace("/(app)/dashboard")}
        />
        <BottomNavItem
          icon={<MaterialCommunityIcons name="history" size={24} color="#7A828F" />}
          label="HISTORY"
          onPress={() => router.replace("/(app)/history")}
        />
        <BottomNavItem
          icon={<Ionicons name="calendar-outline" size={24} color="#1D64D7" />}
          label="LEAVE"
          active
        />
        <BottomNavItem
          icon={<FontAwesome6 name="user" size={18} color="#7A828F" />}
          label="PROFIL"
        />
      </View>
    </View>
  );
}

function BottomNavItem({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: ReactNode;
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

function collectLeaveEntries(data: MobileLeavePagePayload | null): LeaveCalendarEntry[] {
  if (!data) {
    return [];
  }

  const entries: LeaveCalendarEntry[] = [];
  const seen = new Set<string>();

  const append = (item: MobileLeavePageLeaveItem | MobileLeavePageHistoryItem | null) => {
    if (!item?.date_start || !item.date_end) {
      return;
    }

    const key = `${item.id}:${item.date_start}:${item.date_end}:${item.reason ?? ""}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    entries.push({
      id: item.id,
      statusLabel: item.status_label,
      dateStart: item.date_start,
      dateEnd: item.date_end,
      reason: item.reason,
    });
  };

  append(data.today_context.leave);
  for (const item of data.active_or_upcoming_leaves) {
    append(item);
  }
  for (const item of data.history.items) {
    append(item);
  }

  return entries;
}

function buildLeaveDateMap(entries: LeaveCalendarEntry[]): Map<string, LeaveCalendarEntry> {
  const map = new Map<string, LeaveCalendarEntry>();

  for (const entry of entries) {
    const startDate = parseDateOnly(entry.dateStart);
    const endDate = parseDateOnly(entry.dateEnd);

    if (!startDate || !endDate || startDate.getTime() > endDate.getTime()) {
      continue;
    }

    let cursor = startOfDay(startDate);
    const end = startOfDay(endDate);
    let guard = 0;

    while (cursor.getTime() <= end.getTime() && guard < 370) {
      const key = toDateKey(cursor);
      if (!map.has(key)) {
        map.set(key, entry);
      }

      cursor = addDays(cursor, 1);
      guard += 1;
    }
  }

  return map;
}

function buildCalendarCells({
  month,
  selectedDateKey,
  todayKey,
  leaveByDate,
}: {
  month: Date;
  selectedDateKey: string | null;
  todayKey: string;
  leaveByDate: Map<string, LeaveCalendarEntry>;
}): CalendarCell[] {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const cells: CalendarCell[] = [];
  let cursor = gridStart;

  while (cursor.getTime() <= gridEnd.getTime()) {
    const key = toDateKey(cursor);
    cells.push({
      key,
      day: cursor.getDate(),
      isCurrentMonth: isSameMonth(cursor, monthStart),
      isToday: key === todayKey,
      isSelected: key === selectedDateKey,
      hasLeave: leaveByDate.has(key),
    });

    cursor = addDays(cursor, 1);
  }

  return cells;
}

function formatMonthYear(date: Date): string {
  const value = date.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDateKey(value: string): string {
  const date = parseDateOnly(value);
  if (!date) {
    return value;
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateFromKey(value: string): string {
  return formatDateKey(value);
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() !== month
    || date.getDate() !== day
  ) {
    return null;
  }

  return startOfDay(date);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfWeek(date: Date): Date {
  const dayOfWeek = date.getDay();
  return addDays(startOfDay(date), -dayOfWeek);
}

function endOfWeek(date: Date): Date {
  const dayOfWeek = date.getDay();
  return addDays(startOfDay(date), 6 - dayOfWeek);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function isSameMonth(first: Date, second: Date): boolean {
  return (
    first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EEF0F3",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10,
    backgroundColor: "#EEF0F3",
  },
  loadingText: {
    fontSize: 14,
    color: "#394355",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#A21E1E",
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    color: "#475467",
    textAlign: "center",
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 4,
    backgroundColor: "#1D64D7",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  menuButtonSpacer: {
    width: 36,
    height: 36,
  },
  headerTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "800",
    color: "#0E1522",
    letterSpacing: -0.4,
  },
  todayCardLeave: {
    borderRadius: 22,
    backgroundColor: "#1D64D7",
    paddingHorizontal: 18,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  todayCardWorking: {
    borderRadius: 14,
    backgroundColor: "#F4F6F8",
    borderWidth: 1,
    borderColor: "#E1E7EE",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  todayIconWrapLeave: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  todayIconWrapWorking: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#D9F1E2",
    alignItems: "center",
    justifyContent: "center",
  },
  todayTextWrap: {
    flex: 1,
    gap: 2,
  },
  todayLabelLeave: {
    fontSize: 15,
    color: "#DDEAFF",
    fontWeight: "600",
  },
  todayValueLeave: {
    fontSize: 34,
    lineHeight: 38,
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  todayNoteLeave: {
    fontSize: 12,
    color: "#E9F1FF",
    lineHeight: 17,
  },
  todayLabelWorking: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  todayValueWorking: {
    fontSize: 25,
    lineHeight: 30,
    color: "#0D7F3D",
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  todayNoteWorking: {
    fontSize: 12,
    color: "#556171",
    lineHeight: 17,
  },
  calendarCard: {
    borderRadius: 22,
    backgroundColor: "#F7F8FA",
    padding: 16,
    gap: 12,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarMonthText: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
    color: "#131A26",
    letterSpacing: -0.3,
  },
  calendarNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  calendarNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  weekdayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  weekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 12,
    color: "#7A8290",
    fontWeight: "700",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 6,
  },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  dayNumberWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumberWrapToday: {
    borderColor: "#CAD6EA",
  },
  dayNumberWrapSelected: {
    borderColor: "#1D64D7",
    backgroundColor: "#F3F8FF",
  },
  dayNumberText: {
    fontSize: 23,
    lineHeight: 27,
    color: "#101621",
    fontWeight: "600",
  },
  dayNumberTextMuted: {
    color: "#C0C6D2",
  },
  dayNumberTextSelected: {
    color: "#0F2D61",
    fontWeight: "700",
  },
  dotSlot: {
    height: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  leaveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C01B1B",
  },
  detailCard: {
    borderRadius: 18,
    backgroundColor: "#F7F8FA",
    borderWidth: 1,
    borderColor: "#E4E7EC",
    padding: 16,
    gap: 12,
  },
  detailTitle: {
    fontSize: 16,
    lineHeight: 20,
    color: "#121A28",
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  detailRow: {
    gap: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6C7482",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  detailValue: {
    fontSize: 20,
    lineHeight: 25,
    color: "#111827",
    fontWeight: "700",
    letterSpacing: -0.15,
  },
  detailReason: {
    fontSize: 16,
    lineHeight: 23,
    color: "#1F2937",
    fontWeight: "500",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#E3E7EE",
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
  },
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
