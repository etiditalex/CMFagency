export type EmployeeStatus = "active" | "inactive";
export type EmployeeAttendanceStatus = "out" | "in";
export type EmployeeAttendanceEventType = "sign_in" | "sign_out";
/** General staff vs real-estate CRM team (separate reporting windows). */
export type EmployeeMemberType = "staff" | "crm";

export type ShiftDefinition = {
  shiftNumber: 1 | 2;
  startTime: string; // HH:mm format (e.g. "06:00" for 6am)
  endTime: string; // HH:mm format (e.g. "15:00" for 3pm)
  signInStartTime: string; // earliest sign-in (e.g. "06:00")
  signInTime: string; // latest on-time sign-in (e.g. "08:00")
  signOutTime: string; // expected sign-out (e.g. "15:00")
};

export type EmployeeReportingSettings = {
  /** Earliest expected sign-in (e.g. 07:00). */
  staffReportingSignInStart: string;
  /** Latest on-time sign-in (e.g. 08:00); after this = late. */
  staffReportingSignIn: string;
  /** Expected sign-out from this time (e.g. 17:00). */
  staffReportingSignOut: string;
  crmReportingSignInStart: string;
  crmReportingSignIn: string;
  crmReportingSignOut: string;
  updatedAt: string | null;
  /** Multi-shift support for retail/hospitality (e.g. morning 6am-3pm, evening 3:30pm-11pm). */
  shiftEnabled?: boolean;
  shift1StartTime?: string; // HH:mm (e.g. "06:00")
  shift1EndTime?: string; // HH:mm (e.g. "15:00")
  shift2StartTime?: string; // HH:mm (e.g. "15:30")
  shift2EndTime?: string; // HH:mm (e.g. "23:00")
  shift1SignInStartTime?: string;
  shift1SignInTime?: string;
  shift1SignOutTime?: string;
  shift2SignInStartTime?: string;
  shift2SignInTime?: string;
  shift2SignOutTime?: string;
};

export type EmployeeRecord = {
  id: string;
  memberType: EmployeeMemberType;
  fullName: string;
  email: string | null;
  department: string;
  jobTitle: string;
  employeeCode: string | null;
  qrCodeToken: string | null;
  status: EmployeeStatus;
  attendanceStatus: EmployeeAttendanceStatus;
  registeredDeviceId: string | null;
  lastSignedInAt: string | null;
  lastSignedOutAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmployeeAttendanceRecord = {
  id: string;
  employeeId: string;
  eventType: EmployeeAttendanceEventType;
  deviceId: string | null;
  deviceLabel: string | null;
  deviceInfo: Record<string, unknown>;
  createdAt: string;
};

export type EmployeeFormInput = {
  fullName: string;
  email?: string;
  department?: string;
  jobTitle?: string;
  employeeCode?: string;
  memberType?: EmployeeMemberType;
};

/** HR leave types recorded against an employee. */
export type EmployeeLeaveType = "annual" | "sick" | "unpaid" | "compassionate" | "other";

export type EmployeeLeaveStatus = "pending" | "approved" | "rejected";

export type EmployeeLeaveRecord = {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  leaveType: EmployeeLeaveType;
  status: EmployeeLeaveStatus;
  notes: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  notificationSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};
