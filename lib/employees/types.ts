export type EmployeeStatus = "active" | "inactive";
export type EmployeeAttendanceStatus = "out" | "in";
export type EmployeeAttendanceEventType = "sign_in" | "sign_out";
/** General staff vs real-estate CRM team (separate reporting windows). */
export type EmployeeMemberType = "staff" | "crm";

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
