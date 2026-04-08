import {
  Feather,
  Ionicons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
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
import { AppPageHeader } from "../../src/components/app-page-header";
import { BottomNavbar } from "../../src/components/bottom-navbar";
import { useAuthStore } from "../../src/store/auth-store";
import { spacing, typography } from "../../src/theme/typography";
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

type HolidayCalendarEntry = {
  id: number;
  name: string | null;
  dateStart: string;
  dateEnd: string;
};

type CalendarCell = {
  key: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasLeave: boolean;
  hasHoliday: boolean;
};

const WEEKDAY_LABELS = ["S", "S", "R", "K", "J", "S", "M"];
const SKELETON_WEEK_COLUMNS = Array.from({ length: 7 });
const SKELETON_CALENDAR_ROWS = Array.from({ length: 6 });

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
  const holidayEntries = useMemo(() => collectHolidayEntries(state.data), [state.data]);
  const holidayByDate = useMemo(() => buildHolidayDateMap(holidayEntries), [holidayEntries]);

  const todayKey = state.data?.today_context.date ?? toDateKey(new Date());
  const calendarCells = useMemo(
    () =>
      buildCalendarCells({
        month: displayMonth,
        selectedDateKey,
        todayKey,
        leaveByDate,
        holidayByDate,
      }),
    [displayMonth, holidayByDate, leaveByDate, selectedDateKey, todayKey],
  );
  const calendarRows = useMemo(() => {
    const rows: CalendarCell[][] = [];
    for (let index = 0; index < calendarCells.length; index += 7) {
      rows.push(calendarCells.slice(index, index + 7));
    }
    return rows;
  }, [calendarCells]);

  const selectedLeave = selectedDateKey ? (leaveByDate.get(selectedDateKey) ?? null) : null;
  const selectedHoliday = selectedDateKey ? (holidayByDate.get(selectedDateKey) ?? null) : null;

  if (state.isLoading && !state.data) {
    return (
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: screenTopPadding, paddingBottom: navHeight + 26 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <AppPageHeader title="Cuti" topInset={0} />

          <View style={styles.skeletonTodayCard}>
            <View style={[styles.skeletonLine, styles.skeletonTodayLabel]} />

            <View style={styles.skeletonTodayBody}>
              <View style={[styles.skeletonLine, styles.skeletonTodayTitle]} />
              <View style={styles.skeletonTodayIcon} />
            </View>

            <View style={styles.skeletonTodayFooter}>
              <View style={[styles.skeletonLine, styles.skeletonTodayMetaShort]} />
              <View style={[styles.skeletonLine, styles.skeletonTodayMetaLong]} />
            </View>
          </View>

          <View style={styles.skeletonCalendarCard}>
            <View style={styles.skeletonCalendarHeader}>
              <View style={[styles.skeletonLine, styles.skeletonCalendarMonth]} />
              <View style={styles.skeletonCalendarNavRow}>
                <View style={styles.skeletonCalendarNav} />
                <View style={styles.skeletonCalendarNav} />
              </View>
            </View>

            <View style={styles.skeletonWeekdayRow}>
              {SKELETON_WEEK_COLUMNS.map((_, index) => (
                <View key={`weekday-${index}`} style={styles.skeletonWeekdayDot} />
              ))}
            </View>

            <View style={styles.skeletonCalendarGrid}>
              {SKELETON_CALENDAR_ROWS.map((_, rowIndex) => (
                <View
                  key={`row-${rowIndex}`}
                  style={[
                    styles.skeletonCalendarRow,
                    rowIndex < SKELETON_CALENDAR_ROWS.length - 1 && styles.skeletonCalendarRowSpacing,
                  ]}
                >
                  {SKELETON_WEEK_COLUMNS.map((_, colIndex) => (
                    <View key={`cell-${rowIndex}-${colIndex}`} style={styles.skeletonCalendarCell}>
                      <View style={styles.skeletonCalendarPill} />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.skeletonBottomRow}>
            <View style={styles.skeletonBottomItem}>
              <View style={styles.skeletonBottomDot} />
              <View style={[styles.skeletonLine, styles.skeletonBottomLabel]} />
            </View>
            <View style={styles.skeletonBottomItem}>
              <View style={styles.skeletonBottomDot} />
              <View style={[styles.skeletonLine, styles.skeletonBottomLabel]} />
            </View>
            <View style={styles.skeletonBottomItem}>
              <View style={styles.skeletonBottomDot} />
              <View style={[styles.skeletonLine, styles.skeletonBottomLabel]} />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!state.data) {
    return (
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: screenTopPadding, paddingBottom: navHeight + 26 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <AppPageHeader title="Cuti" topInset={0} />

          <View style={styles.stateCard}>
            <Text style={styles.errorTitle}>Halaman cuti gagal dimuat.</Text>
            <Text style={styles.errorMessage}>
              {state.errorMessage ?? "Terjadi kesalahan yang tidak diketahui."}
            </Text>
            <Pressable style={styles.retryButton} onPress={() => void fetchLeavePage()}>
              <Text style={styles.retryButtonText}>Coba lagi</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  const isOnLeaveToday = state.data.today_context.attendance_status === "on_leave";
  const isHolidayToday = Boolean(state.data.today_context.is_holiday);
  const holidayName = state.data.today_context.holiday_name?.trim() || "Hari Libur";
  const isTodayLeaveLike = isOnLeaveToday || isHolidayToday;
  const statusLabel = isHolidayToday && !isOnLeaveToday
    ? "Status Hari Ini Cuti"
    : "Status Hari Ini";
  const statusTitle = isOnLeaveToday
    ? (state.data.today_context.attendance_status_label ?? "Sedang Cuti")
    : isHolidayToday
      ? `(${holidayName})`
      : "Status hari ini masuk kerja";
  const statusNote = isOnLeaveToday
    ? (state.data.today_context.attendance_note ?? "Anda tidak perlu check-in hari ini.")
    : isHolidayToday
      ? "Selamat menikmati cuti"
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
        <AppPageHeader title="Cuti" topInset={0} />

        <View style={isTodayLeaveLike ? styles.todayCardLeave : styles.todayCardWorking}>
          <View style={isTodayLeaveLike ? styles.todayIconWrapLeave : styles.todayIconWrapWorking}>
            {isTodayLeaveLike ? (
              <Ionicons name="calendar-outline" size={30} color="#FFFFFF" />
            ) : (
              <Ionicons name="briefcase" size={20} color="#0D7F3D" />
            )}
          </View>
          <View style={styles.todayTextWrap}>
            <Text style={isTodayLeaveLike ? styles.todayLabelLeave : styles.todayLabelWorking}>
              {statusLabel}
            </Text>
            <Text style={isTodayLeaveLike ? styles.todayValueLeave : styles.todayValueWorking}>
              {statusTitle}
            </Text>
            <Text style={isTodayLeaveLike ? styles.todayNoteLeave : styles.todayNoteWorking}>
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
            {calendarRows.map((row, rowIndex) => (
              <View
                key={`row-${rowIndex}`}
                style={[
                  styles.calendarRow,
                  rowIndex < calendarRows.length - 1 && styles.calendarRowSpacing,
                ]}
              >
                {row.map((cell) => (
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
                      {cell.hasHoliday ? (
                        <View style={styles.holidayDot} />
                      ) : cell.hasLeave ? (
                        <View style={styles.leaveDot} />
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
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

        {selectedDateKey && selectedHoliday ? (
          <View style={styles.detailCard}>
            <Text style={styles.detailTitle}>Detail Hari Libur</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tanggal Dipilih</Text>
              <Text style={styles.detailValue}>{formatDateFromKey(selectedDateKey)}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Periode Libur</Text>
              <Text style={styles.detailValue}>
                {formatDateKey(selectedHoliday.dateStart)} - {formatDateKey(selectedHoliday.dateEnd)}
              </Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Nama Libur</Text>
              <Text style={styles.detailReason}>{selectedHoliday.name ?? "Hari Libur"}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <BottomNavbar
        activeTab="leave"
        navHeight={navHeight}
        navBottomPadding={navBottomPadding}
        onPressProfile={() => router.replace("/(app)/profile")}
      />
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

function collectHolidayEntries(data: MobileLeavePagePayload | null): HolidayCalendarEntry[] {
  if (!data) {
    return [];
  }

  const entries: HolidayCalendarEntry[] = [];
  const seen = new Set<string>();
  const holidayItems = Array.isArray(data.holidays) && data.holidays.length > 0
    ? data.holidays
    : (Array.isArray(data.holiday_dates)
        ? data.holiday_dates.map((date, index) => ({
            id: -(index + 1),
            name: null,
            start_from: date,
            end_at: date,
          }))
        : []);

  for (const item of holidayItems) {
    if (!item.start_from || !item.end_at) {
      continue;
    }

    const key = `${item.id}:${item.start_from}:${item.end_at}:${item.name ?? ""}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    entries.push({
      id: item.id,
      name: item.name,
      dateStart: item.start_from,
      dateEnd: item.end_at,
    });
  }

  return entries;
}

function buildHolidayDateMap(entries: HolidayCalendarEntry[]): Map<string, HolidayCalendarEntry> {
  const map = new Map<string, HolidayCalendarEntry>();

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
  holidayByDate,
}: {
  month: Date;
  selectedDateKey: string | null;
  todayKey: string;
  leaveByDate: Map<string, LeaveCalendarEntry>;
  holidayByDate: Map<string, HolidayCalendarEntry>;
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
      hasHoliday: holidayByDate.has(key),
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
  const dayOfWeek = (date.getDay() + 6) % 7;
  return addDays(startOfDay(date), -dayOfWeek);
}

function endOfWeek(date: Date): Date {
  const dayOfWeek = (date.getDay() + 6) % 7;
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
    gap: spacing.s16,
  },
  stateCard: {
    borderRadius: 18,
    backgroundColor: "#F7F8FA",
    paddingHorizontal: 18,
    paddingVertical: 18,
    alignItems: "center",
    gap: spacing.s8,
  },
  skeletonTodayCard: {
    borderRadius: 18,
    backgroundColor: "#F0F2F5",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  skeletonLine: {
    backgroundColor: "#E1E5EA",
    borderRadius: 999,
  },
  skeletonTodayLabel: {
    width: 64,
    height: 10,
  },
  skeletonTodayBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.s12,
  },
  skeletonTodayTitle: {
    flex: 1,
    height: 28,
    maxWidth: 180,
  },
  skeletonTodayIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E1E5EA",
  },
  skeletonTodayFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  skeletonTodayMetaShort: {
    width: 56,
    height: 12,
  },
  skeletonTodayMetaLong: {
    width: 56,
    height: 12,
  },
  skeletonCalendarCard: {
    borderRadius: 22,
    backgroundColor: "#F0F2F5",
    padding: 16,
    gap: spacing.s12,
  },
  skeletonCalendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  skeletonCalendarMonth: {
    width: 90,
    height: 12,
  },
  skeletonCalendarNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  skeletonCalendarNav: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#E1E5EA",
  },
  skeletonWeekdayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  skeletonWeekdayDot: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E1E5EA",
  },
  skeletonCalendarGrid: {
    flexDirection: "column",
  },
  skeletonCalendarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  skeletonCalendarRowSpacing: {
    marginBottom: 8,
  },
  skeletonCalendarCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonCalendarPill: {
    width: 20,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#E1E5EA",
  },
  skeletonBottomRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 12,
  },
  skeletonBottomItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  skeletonBottomDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#E1E5EA",
  },
  skeletonBottomLabel: {
    width: 42,
    height: 7,
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
  todayCardLeave: {
    borderRadius: 22,
    backgroundColor: "#1D64D7",
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.s12,
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
    gap: spacing.s12,
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
    gap: spacing.s4,
  },
  todayLabelLeave: {
    ...typography.caption,
    color: "#DDEAFF",
  },
  todayValueLeave: {
    ...typography.metricL,
    fontSize: 27,
    lineHeight: 32,
    color: "#FFFFFF",
  },
  todayNoteLeave: {
    ...typography.caption,
    color: "#E9F1FF",
    fontWeight: "500",
  },
  todayLabelWorking: {
    ...typography.labelCaps,
    fontSize: 11,
    color: "#111827",
    fontWeight: "700",
  },
  todayValueWorking: {
    ...typography.titleCard,
    fontSize: 24,
    lineHeight: 28,
    color: "#0D7F3D",
  },
  todayNoteWorking: {
    ...typography.caption,
    color: "#556171",
    fontWeight: "500",
  },
  calendarCard: {
    borderRadius: 22,
    backgroundColor: "#F7F8FA",
    padding: 16,
    gap: spacing.s12,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarMonthText: {
    ...typography.titleCard,
    fontSize: 21,
    lineHeight: 25,
    color: "#131A26",
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
    flex: 1,
    textAlign: "center",
    ...typography.caption,
    fontSize: 11,
    color: "#7A8290",
    fontWeight: "700",
  },
  calendarGrid: {
    flexDirection: "column",
  },
  calendarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  calendarRowSpacing: {
    marginBottom: 6,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  dayNumberWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
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
    fontSize: 19,
    lineHeight: 23,
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
  holidayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C01B1B",
  },
  leaveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1D64D7",
  },
  detailCard: {
    borderRadius: 18,
    backgroundColor: "#F7F8FA",
    borderWidth: 1,
    borderColor: "#E4E7EC",
    padding: 16,
    gap: spacing.s12,
  },
  detailTitle: {
    ...typography.labelCaps,
    fontSize: 12,
    lineHeight: 15,
    color: "#121A28",
    fontWeight: "800",
  },
  detailRow: {
    gap: spacing.s6,
  },
  detailLabel: {
    ...typography.labelCaps,
    fontSize: 11,
    color: "#6C7482",
    fontWeight: "700",
  },
  detailValue: {
    ...typography.titleCard,
    fontSize: 17,
    lineHeight: 22,
    color: "#111827",
    fontWeight: "700",
  },
  detailReason: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 21,
    color: "#1F2937",
    fontWeight: "500",
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#E3E7EE",
  },
});
