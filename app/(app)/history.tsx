import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { router } from "expo-router";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useState,
} from "react";
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
  mobileAttendanceApi,
  normalizeApiError,
} from "../../src/lib/api";
import { BottomNavbar } from "../../src/components/bottom-navbar";
import { useAuthStore } from "../../src/store/auth-store";
import type {
  MobileAttendanceHistoryItem,
  MobileAttendanceHistoryMeta,
  MobileAttendanceRecordStatus,
} from "../../src/types/api";
import { formatDurationFromMinutes } from "../../src/utils/duration";

type HistoryFilterKey = "all" | "this_month" | MobileAttendanceRecordStatus;

type HistoryState = {
  items: MobileAttendanceHistoryItem[];
  meta: MobileAttendanceHistoryMeta | null;
  isLoading: boolean;
  isRefreshing: boolean;
  errorMessage: string | null;
};

type BadgeTone = "green" | "blue" | "gray" | "red";

type AttendanceInsight = {
  text: string;
  tone: BadgeTone | "neutral";
  icon: ComponentProps<typeof Ionicons>["name"];
};

const FILTER_OPTIONS: Array<{ key: HistoryFilterKey; label: string }> = [
  { key: "all", label: "Semua Data" },
  { key: "this_month", label: "Bulan Ini" },
  { key: "complete", label: "Selesai" },
  { key: "ongoing", label: "Berjalan" },
  { key: "incomplete", label: "Belum Lengkap" },
];

const INITIAL_STATE: HistoryState = {
  items: [],
  meta: null,
  isLoading: true,
  isRefreshing: false,
  errorMessage: null,
};

const PAGE_SIZE = 5;

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((state) => state.logout);

  const [state, setState] = useState<HistoryState>(INITIAL_STATE);
  const [activeFilter, setActiveFilter] = useState<HistoryFilterKey>("all");
  const [page, setPage] = useState(1);

  const navBottomPadding = Math.max(insets.bottom, 10);
  const navHeight = 82 + navBottomPadding;
  const screenTopPadding = Math.max(insets.top + 10, 20);

  const loadHistory = useCallback(
    async ({
      mode,
      targetPage,
      targetFilter,
    }: {
      mode: "initial" | "refresh";
      targetPage: number;
      targetFilter: HistoryFilterKey;
    }) => {
      setState((previous) => ({
        ...previous,
        isLoading: mode === "initial",
        isRefreshing: mode === "refresh",
        errorMessage: null,
      }));

      try {
        const query = buildHistoryQuery(targetFilter);

        const response = await mobileAttendanceApi.fetchHistory({
          page: targetPage,
          perPage: PAGE_SIZE,
          sortBy: "work_date",
          sortDirection: "desc",
          recordStatus: query.recordStatus,
          startDate: query.startDate,
          endDate: query.endDate,
        });

        setState({
          items: response.data,
          meta: response.meta,
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
        setState((previous) => ({
          ...previous,
          isLoading: false,
          isRefreshing: false,
          errorMessage: apiError.message,
        }));
      }
    },
    [logout],
  );

  useEffect(() => {
    void loadHistory({
      mode: "initial",
      targetPage: page,
      targetFilter: activeFilter,
    });
  }, [activeFilter, loadHistory, page]);

  const handleRefresh = async () => {
    await loadHistory({
      mode: "refresh",
      targetPage: page,
      targetFilter: activeFilter,
    });
  };

  const handleFilterChange = (filter: HistoryFilterKey) => {
    if (filter === activeFilter && page === 1) {
      return;
    }

    setActiveFilter(filter);
    setPage(1);
  };

  const handleResetFilters = () => {
    setActiveFilter("all");
    setPage(1);
  };

  const canGoSebelumnya = (state.meta?.current_page ?? 1) > 1;
  const canGoSelanjutnya = state.meta
    ? state.meta.current_page < state.meta.last_page
    : false;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: screenTopPadding, paddingBottom: navHeight + 26 },
        ]}
        refreshControl={
          <RefreshControl refreshing={state.isRefreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={18} color="#132440" />
            </View>
            <Text style={styles.headerTitle}>History Absensi</Text>
          </View>
          <Pressable style={styles.iconButton} hitSlop={8}>
            <Ionicons name="options-outline" size={22} color="#5D6B82" />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_OPTIONS.map((option) => {
            const isActive = activeFilter === option.key;

            return (
              <Pressable
                key={option.key}
                onPress={() => handleFilterChange(option.key)}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {state.errorMessage && !state.items.length ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Gagal memuat history absensi</Text>
            <Text style={styles.errorMessage}>{state.errorMessage}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() =>
                void loadHistory({
                  mode: "initial",
                  targetPage: page,
                  targetFilter: activeFilter,
                })
              }
            >
              <Text style={styles.retryButtonText}>Coba lagi</Text>
            </Pressable>
          </View>
        ) : null}

        {state.isLoading && !state.items.length ? (
          <HistorySkeleton />
        ) : state.items.length > 0 ? (
          <>
            <View style={styles.cardList}>
              {state.items.map((item) => (
                <HistoryCard key={item.id} item={item} />
              ))}
            </View>

            {state.meta && state.meta.last_page > 1 ? (
              <View style={styles.paginationRow}>
                <Pressable
                  style={[styles.pageButton, !canGoSebelumnya && styles.pageButtonDisabled]}
                  disabled={!canGoSebelumnya}
                  onPress={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <Feather name="chevron-left" size={16} color="#273142" />
                  <Text style={styles.pageButtonText}>Sebelumnya</Text>
                </Pressable>

                <Text style={styles.paginationText}>
                  HALAMAN{" "}
                  <Text style={styles.paginationCurrent}>{state.meta.current_page}</Text> DARI{" "}
                  {state.meta.last_page}
                </Text>

                <Pressable
                  style={[styles.pageButton, !canGoSelanjutnya && styles.pageButtonDisabled]}
                  disabled={!canGoSelanjutnya}
                  onPress={() =>
                    setPage((current) => Math.min(state.meta?.last_page ?? current, current + 1))
                  }
                >
                  <Text style={styles.pageButtonText}>Selanjutnya</Text>
                  <Feather name="chevron-right" size={16} color="#273142" />
                </Pressable>
              </View>
            ) : null}
          </>
        ) : (
          <EmptyHistoryState
            showReset={activeFilter !== "all" || page > 1}
            onReset={handleResetFilters}
            filterLabel={resolveFilterLabel(activeFilter)}
          />
        )}
      </ScrollView>

      <BottomNavbar
        activeTab="history"
        navHeight={navHeight}
        navBottomPadding={navBottomPadding}
        onPressProfile={() => router.replace("/(app)/profile")}
      />
    </View>
  );
}

function HistoryCard({ item }: { item: MobileAttendanceHistoryItem }) {
  const statusBadge = resolveRecordStatusBadge(item.record_status);
  const attendanceInsight = resolveAttendanceInsight(item);
  const correctionLabel = item.correction.latest_status
    ? translateCorrectionStatus(item.correction.latest_status)
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardDate}>{formatWorkDate(item.work_date)}</Text>

        <View style={styles.cardBadgeWrap}>
          <StatusBadge label={statusBadge.label} tone={statusBadge.tone} />
          {item.is_suspicious ? <StatusBadge label="Mencurigakan" tone="red" /> : null}
        </View>
      </View>

      <Text style={styles.officeName}>{item.office_location.name ?? "Kantor"}</Text>

      <View style={styles.clockRow}>
        <View style={styles.clockCol}>
          <Text style={styles.clockLabel}>JAM MASUK</Text>
          <Text style={styles.clockValue}>{formatClock(item.check_in_at)}</Text>
        </View>
        <View style={styles.clockCol}>
          <Text style={styles.clockLabel}>JAM PULANG</Text>
          <Text style={styles.clockValue}>{formatClock(item.check_out_at)}</Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.metaRow}>
        <View style={styles.metaLeft}>
          <Ionicons
            name={attendanceInsight.icon}
            size={15}
            color={resolveInsightColor(attendanceInsight.tone)}
          />
          <Text
            style={[
              styles.metaPrimary,
              attendanceInsight.tone === "neutral" && styles.metaPrimaryNeutral,
              attendanceInsight.tone === "red" && styles.metaPrimaryRed,
            ]}
          >
            {attendanceInsight.text}
          </Text>
        </View>

        {item.correction.has_correction ? (
          <Text style={styles.correctionText}>
            PERBAIKAN:{" "}
            <Text
              style={[
                styles.correctionStatus,
                item.correction.latest_status === "approved"
                  ? styles.correctionApproved
                  : item.correction.latest_status === "rejected"
                    ? styles.correctionRejected
                    : styles.correctionPending,
              ]}
            >
              {correctionLabel ?? "-"}
            </Text>
          </Text>
        ) : (
          <Text style={styles.correctionTextMuted}>PERBAIKAN: -</Text>
        )}
      </View>
    </View>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: BadgeTone;
}) {
  return (
    <View
      style={[
        styles.statusBadge,
        tone === "green"
          ? styles.badgeGreen
          : tone === "blue"
            ? styles.badgeBlue
            : tone === "red"
              ? styles.badgeRed
              : styles.badgeGray,
      ]}
    >
      <Ionicons
        name={
          tone === "green"
            ? "checkmark-circle"
            : tone === "blue"
              ? "sync-circle"
              : tone === "red"
                ? "alert-circle"
                : "alert-circle-outline"
        }
        size={13}
        color={
          tone === "green"
            ? "#0F7B34"
            : tone === "blue"
              ? "#1F63D9"
              : tone === "red"
                ? "#BF1A1A"
                : "#4D5563"
        }
      />
      <Text
        style={[
          styles.statusBadgeText,
          tone === "green"
            ? styles.badgeTextGreen
            : tone === "blue"
              ? styles.badgeTextBlue
              : tone === "red"
                ? styles.badgeTextRed
                : styles.badgeTextGray,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function HistorySkeleton() {
  return (
    <View style={styles.cardList}>
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader}>
            <View style={styles.skeletonLineWide} />
            <View style={styles.skeletonPill} />
          </View>
          <View style={styles.skeletonLineMedium} />
          <View style={styles.skeletonClockRow}>
            <View>
              <View style={styles.skeletonLineLabel} />
              <View style={styles.skeletonLineClock} />
            </View>
            <View>
              <View style={styles.skeletonLineLabel} />
              <View style={styles.skeletonLineClock} />
            </View>
          </View>
          <View style={styles.skeletonDivider} />
          <View style={styles.skeletonFooter}>
            <View style={styles.skeletonLineSmall} />
            <View style={styles.skeletonLineSmall} />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyHistoryState({
  showReset,
  onReset,
  filterLabel,
}: {
  showReset: boolean;
  onReset: () => void;
  filterLabel: string;
}) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIllustration}>
        <MaterialCommunityIcons name="folder-search-outline" size={88} color="#7EA6D6" />
      </View>
      <Text style={styles.emptyTitle}>Data absensi tidak ditemukan.</Text>
      <Text style={styles.emptyDescription}>
        {showReset
          ? `Tidak ada data untuk filter "${filterLabel}". Coba filter lain.`
          : "Data absensi akan tampil di sini setelah Anda mulai menggunakan absensi mobile."}
      </Text>

      {showReset ? (
        <Pressable style={styles.emptyButton} onPress={onReset}>
          <Ionicons name="refresh" size={19} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>Atur Ulang Filter</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function resolveRecordStatusBadge(
  status: MobileAttendanceRecordStatus | null,
): { label: string; tone: BadgeTone } {
  if (status === "complete") {
    return { label: "Selesai", tone: "green" };
  }

  if (status === "ongoing") {
    return { label: "Berjalan", tone: "blue" };
  }

  return { label: "Belum Lengkap", tone: "gray" };
}

function resolveAttendanceInsight(item: MobileAttendanceHistoryItem): AttendanceInsight {
  if ((item.overtime_minutes ?? 0) > 0) {
    return {
      text: `${formatDurationFromMinutes(item.overtime_minutes ?? 0)} Lembur`,
      tone: "green",
      icon: "time-outline",
    };
  }

  if ((item.late_minutes ?? 0) > 0) {
    return {
      text: `Terlambat ${formatDurationFromMinutes(item.late_minutes ?? 0)}`,
      tone: "blue",
      icon: "warning-outline",
    };
  }

  if ((item.early_leave_minutes ?? 0) > 0) {
    return {
      text: `Pulang Lebih Awal ${formatDurationFromMinutes(item.early_leave_minutes ?? 0)}`,
      tone: "red",
      icon: "log-out-outline",
    };
  }

  if (!item.check_in_at && !item.check_out_at) {
    return {
      text: "Tidak ada data",
      tone: "neutral",
      icon: "remove-circle-outline",
    };
  }

  return {
    text: "Sesuai jadwal",
    tone: "neutral",
    icon: "checkmark-circle-outline",
  };
}

function resolveInsightColor(tone: AttendanceInsight["tone"]): string {
  if (tone === "green") {
    return "#127C41";
  }

  if (tone === "blue") {
    return "#8B5C00";
  }

  if (tone === "red") {
    return "#C22424";
  }

  return "#758196";
}

function resolveFilterLabel(filter: HistoryFilterKey): string {
  const option = FILTER_OPTIONS.find((item) => item.key === filter);
  return option?.label ?? "Semua Data";
}

function buildHistoryQuery(filter: HistoryFilterKey): {
  recordStatus?: MobileAttendanceRecordStatus;
  startDate?: string;
  endDate?: string;
} {
  if (filter === "complete" || filter === "ongoing" || filter === "incomplete") {
    return { recordStatus: filter };
  }

  if (filter === "this_month") {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      startDate: toYmd(firstDay),
      endDate: toYmd(now),
    };
  }

  return {};
}

function formatWorkDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatClock(value: string | null): string {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function translateCorrectionStatus(value: string): string {
  if (value === "pending") {
    return "Menunggu";
  }

  if (value === "approved") {
    return "Disetujui";
  }

  if (value === "rejected") {
    return "Ditolak";
  }

  return value;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EEF0F3",
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: "#C7D6EB",
    backgroundColor: "#1C2D46",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    color: "#195FD1",
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 2,
    paddingRight: 8,
  },
  filterChip: {
    minHeight: 40,
    borderRadius: 20,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E1E4E9",
  },
  filterChipActive: {
    backgroundColor: "#1D68D7",
    shadowColor: "#1D68D7",
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3C4657",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  errorCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F2CACA",
    backgroundColor: "#FFF7F7",
    padding: 14,
    gap: 9,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#A61F1F",
  },
  errorMessage: {
    fontSize: 13,
    lineHeight: 20,
    color: "#B13838",
  },
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: 10,
    backgroundColor: "#195FD1",
    paddingVertical: 8,
    paddingHorizontal: 13,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  cardList: {
    gap: 12,
  },
  card: {
    borderRadius: 17,
    backgroundColor: "#F7F8FA",
    borderWidth: 1,
    borderColor: "#E6E8EC",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  cardDate: {
    fontSize: 13,
    color: "#657181",
    fontWeight: "500",
    flexShrink: 1,
  },
  cardBadgeWrap: {
    alignItems: "flex-end",
    gap: 6,
  },
  officeName: {
    fontSize: 16,
    color: "#131B27",
    fontWeight: "800",
    marginTop: -2,
  },
  clockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  clockCol: {
    width: "47%",
    gap: 3,
  },
  clockLabel: {
    fontSize: 11,
    letterSpacing: 0.5,
    color: "#737F90",
    fontWeight: "700",
  },
  clockValue: {
    fontSize: 18,
    color: "#141A23",
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#E2E5EA",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  metaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  metaPrimary: {
    fontSize: 12,
    fontWeight: "600",
    color: "#177F3B",
  },
  metaPrimaryNeutral: {
    color: "#6B7687",
    fontStyle: "italic",
    fontWeight: "500",
  },
  metaPrimaryRed: {
    color: "#C22626",
  },
  correctionText: {
    fontSize: 11,
    color: "#6D7788",
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  correctionStatus: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
  },
  correctionPending: {
    color: "#9A6406",
  },
  correctionApproved: {
    color: "#167637",
  },
  correctionRejected: {
    color: "#C12626",
  },
  correctionTextMuted: {
    fontSize: 11,
    color: "#99A2B0",
    fontWeight: "700",
  },
  statusBadge: {
    borderRadius: 14,
    minHeight: 26,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  badgeGreen: {
    backgroundColor: "#DDF6E6",
  },
  badgeBlue: {
    backgroundColor: "#DFEBFF",
  },
  badgeGray: {
    backgroundColor: "#E8EBEF",
  },
  badgeRed: {
    backgroundColor: "#FBE3E3",
  },
  badgeTextGreen: {
    color: "#0C7A33",
  },
  badgeTextBlue: {
    color: "#195DD0",
  },
  badgeTextGray: {
    color: "#4A5361",
  },
  badgeTextRed: {
    color: "#B71D1D",
  },
  skeletonCard: {
    borderRadius: 17,
    backgroundColor: "#F7F8FA",
    borderWidth: 1,
    borderColor: "#E6E8EC",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 11,
  },
  skeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  skeletonLineWide: {
    width: "56%",
    height: 15,
    borderRadius: 8,
    backgroundColor: "#E4E7EC",
  },
  skeletonPill: {
    width: 86,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E4E7EC",
  },
  skeletonLineMedium: {
    width: "42%",
    height: 18,
    borderRadius: 8,
    backgroundColor: "#E4E7EC",
  },
  skeletonClockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  skeletonLineLabel: {
    width: 62,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#E4E7EC",
    marginBottom: 6,
  },
  skeletonLineClock: {
    width: 100,
    height: 20,
    borderRadius: 8,
    backgroundColor: "#E4E7EC",
  },
  skeletonDivider: {
    height: 1,
    backgroundColor: "#E2E5EA",
  },
  skeletonFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  skeletonLineSmall: {
    width: 104,
    height: 13,
    borderRadius: 6,
    backgroundColor: "#E4E7EC",
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 44,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  emptyIllustration: {
    width: 168,
    height: 168,
    borderRadius: 28,
    backgroundColor: "#EAF0F7",
    borderWidth: 1,
    borderColor: "#DFE6F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  emptyTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "800",
    color: "#141C28",
    textAlign: "center",
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 15,
    lineHeight: 24,
    color: "#485466",
    textAlign: "center",
    maxWidth: 320,
  },
  emptyButton: {
    marginTop: 24,
    borderRadius: 18,
    backgroundColor: "#1B65D3",
    minHeight: 52,
    paddingHorizontal: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#1B65D3",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  paginationRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    minHeight: 34,
    paddingHorizontal: 7,
  },
  pageButtonDisabled: {
    opacity: 0.35,
  },
  pageButtonText: {
    fontSize: 14,
    color: "#253140",
    fontWeight: "500",
  },
  paginationText: {
    fontSize: 13,
    letterSpacing: 1.1,
    color: "#6F7A8B",
    fontWeight: "700",
  },
  paginationCurrent: {
    color: "#1C66D5",
  },
});

