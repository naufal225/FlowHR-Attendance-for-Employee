export type ApiSuccessResponse<TData> = {
  success: boolean;
  message: string;
  data: TData;
};

export type MobileUser = {
  id: number;
  name: string;
  email: string;
  mobile_scope: string;
  division: {
    id: number | null;
    name: string | null;
  };
  office_location: {
    id: number | null;
    name: string | null;
    address: string | null;
  };
  roles: string[];
};

export type MobileLoginPayload = {
  token: string;
  token_type: string;
  user: MobileUser;
};

export type MobileLoginResponse = ApiSuccessResponse<MobileLoginPayload>;

export type MobileMeResponse = ApiSuccessResponse<MobileUser>;

export type MobileLocationStatus = "valid" | "invalid" | "suspicious";

export type MobileLocationAccuracyLevel = "good" | "fair" | "poor";

export type MobileLocationReadiness = {
  office_radius_meter: number | null;
  min_location_accuracy_meter: number | null;
  gps_required: boolean;
  last_known_distance_meter: number | null;
  last_known_accuracy_meter: number | null;
  location_status: MobileLocationStatus | null;
  location_reason: string | null;
  has_location_fix?: boolean;
  accuracy_meter?: number | null;
  distance_meter?: number | null;
  status?: MobileLocationStatus | null;
  status_label?: string | null;
  accuracy_level?: MobileLocationAccuracyLevel | null;
  accuracy_label?: string | null;
  reason?: string | null;
  is_valid?: boolean | null;
  is_suspicious?: boolean | null;
};

export type MobileDashboardPayload = {
  user: {
    id: number;
    name: string;
    email: string;
    office_location_id: number | null;
    office_location_name: string | null;
    active_role: string | null;
  };
  today_status: {
    date: string;
    status: string | null;
    label: string | null;
    attendance_id: number | null;
    check_in_at: string | null;
    check_out_at: string | null;
    is_late: boolean;
    is_early_leave: boolean;
    is_suspicious: boolean;
    reason: string | null;
  };
  attendance_summary: {
    record_status: string | null;
    record_status_label: string | null;
    check_in_status: string | null;
    check_in_status_label: string | null;
    check_out_status: string | null;
    check_out_status_label: string | null;
    late_minutes: number | null;
    early_leave_minutes: number | null;
    overtime_minutes: number | null;
    notes: string | null;
    avg_start?: {
      time: string | null;
      delta_from_shift_start_minutes: number | null;
    };
    this_week?: {
      total_minutes: number;
      total_hours: number;
    };
    recent_activity?: Array<{
      label: string | null;
      type: string | null;
      title: string | null;
      at: string | null;
    }>;
    insight?: {
      type: string | null;
      minutes: number | null;
      message: string | null;
    };
  };
  action_state: {
    next_action: string | null;
    can_check_in: boolean;
    can_check_out: boolean;
    action_disabled_reason: string | null;
  };
  policy: {
    work_start_time: string | null;
    work_end_time: string | null;
    late_tolerance_minutes: number | null;
    timezone: string | null;
  };
  location_readiness: MobileLocationReadiness;
  day_context: {
    is_off_day: boolean;
    is_on_leave: boolean;
    message: string | null;
  };
  recent_attendances: Array<{
    id: number;
    work_date: string | null;
    check_in_at: string | null;
    check_out_at: string | null;
    record_status: string | null;
    is_suspicious: boolean;
  }>;
  alerts: Array<{
    type: string | null;
    title: string | null;
    message: string | null;
  }>;
};

export type MobileDashboardResponse = ApiSuccessResponse<MobileDashboardPayload>;

export type MobileAttendanceRecordStatus = "ongoing" | "complete" | "incomplete";

export type MobileCorrectionStatus = "pending" | "approved" | "rejected";

export type MobileAttendanceHistoryItem = {
  id: number;
  work_date: string | null;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_status: string | null;
  check_out_status: string | null;
  record_status: MobileAttendanceRecordStatus | null;
  late_minutes: number | null;
  early_leave_minutes: number | null;
  overtime_minutes: number | null;
  is_suspicious: boolean;
  office_location: {
    id: number | null;
    name: string | null;
  };
  correction: {
    has_correction: boolean;
    latest_status: MobileCorrectionStatus | null;
    latest_updated_at: string | null;
  };
};

export type MobileAttendanceHistoryMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type MobileAttendanceHistoryResponse = {
  success: boolean;
  message: string;
  data: MobileAttendanceHistoryItem[];
  meta: MobileAttendanceHistoryMeta;
};

export type MobileLeavePageLeaveItem = {
  id: number;
  status: string | null;
  status_label: string | null;
  date_start: string | null;
  date_end: string | null;
  duration_days: number | null;
  reason: string | null;
};

export type MobileLeavePageActiveOrUpcomingItem = MobileLeavePageLeaveItem & {
  approved_date: string | null;
  created_at: string | null;
  is_active: boolean;
  is_upcoming: boolean;
};

export type MobileLeavePageHistoryItem = MobileLeavePageLeaveItem & {
  approved_date: string | null;
  created_at: string | null;
};

export type MobileLeavePageHistoryPagination = {
  current_page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_more: boolean;
};

export type MobileLeavePagePayload = {
  today_context: {
    date: string;
    day_name: string;
    attendance_status: string | null;
    attendance_status_label: string | null;
    attendance_note: string | null;
    is_working_day: boolean;
    leave: MobileLeavePageLeaveItem | null;
    attendance: {
      id: number;
      work_date: string | null;
      check_in_at: string | null;
      check_out_at: string | null;
      record_status: string | null;
    } | null;
  };
  summary: {
    approved_leave_days_this_month: number;
    approved_leave_requests_this_month: number;
    active_leave_count: number;
    upcoming_leave_count: number;
  };
  active_or_upcoming_leaves: MobileLeavePageActiveOrUpcomingItem[];
  history: {
    items: MobileLeavePageHistoryItem[];
    pagination: MobileLeavePageHistoryPagination;
  };
};

export type MobileLeavePageResponse = {
  message: string;
  data: MobileLeavePagePayload;
  meta: {
    server_time: string;
    timezone: string;
  };
};
