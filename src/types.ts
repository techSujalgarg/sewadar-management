/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "super_admin" | "admin" | "executive" | "viewer";

export type EnrollmentType = "New" | "Revival" | "Transfer";

export type SewadarStatus = "Active" | "Inactive" | "Hold" | "Rejected" | "Completed";

export type StageStatus = "pending" | "in_progress" | "completed" | "failed";

export const WORKFLOW_STAGES = [
  { key: "initial_interview", label: "Initial Interview" },
  { key: "application_form", label: "Application Form" },
  { key: "meeting_hod", label: "Meeting with HOD" },
  { key: "verification", label: "Verification (Ground + Cyber)" },
  { key: "temporary_number", label: "Temporary Number" },
  { key: "probation", label: "Probation" },
  { key: "sewa_samiti_form", label: "Sewa Samiti Form" },
  { key: "document_verification", label: "Document Verification" },
  { key: "medical", label: "Medical" },
  { key: "submission", label: "Submission" },
  { key: "sewa_badge", label: "Sewa Badge Issued" }
] as const;

export type WorkflowStageKey = typeof WORKFLOW_STAGES[number]["key"];

export interface StageProgress {
  status: StageStatus;
  date?: string;
  remarks?: string;
  assignedExecutive?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface DocumentItem {
  id: string;
  name: string; // e.g. "Aadhaar Card", "Medical Certificate"
  type: string; // e.g. "pdf", "jpg"
  url: string;
  size: string;
  uploadDate: string;
  version: number;
}

export interface SewadarProfile {
  id: string;
  name: string;
  badgeNumber: string; // e.g., "SEW-9402" or empty if not complete
  tempNumber: string; // Temporary number sequence
  enrollmentType: EnrollmentType;
  contactNumber: string;
  emergencyContact: string;
  gender: "Male" | "Female" | "Other";
  dob: string;
  address: string;
  location: string;
  photographUrl: string;
  status: SewadarStatus;
  progress: number; // 0 - 100 percentage
  createdDate: string; // YYYY-MM-DD
  area?: string; // Satsang Area
  sewaType?: string; // Kitchen (Langar), Security, etc.
  workflow: Record<WorkflowStageKey, StageProgress>;
  documents: DocumentItem[];
}

export type AttendanceStatus = "Present" | "Absent" | "HalfDay" | "Leave";

export interface AttendanceRecord {
  id: string;
  sewadarId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime?: string; // HH:MM AM/PM
  checkOutTime?: string; // HH:MM AM/PM
  method: "Manual" | "QR Scanner";
}

export interface NotificationLog {
  id: string;
  sewadarId: string;
  sewadarName: string;
  type: "WhatsApp" | "Email" | "SMS";
  title: string;
  message: string;
  timestamp: string;
  status: "Sent" | "Failed";
}

export interface AuditLog {
  id: string;
  userEmail: string;
  userRole: string; // Dynamic role
  action: string;
  timestamp: string;
  details: string;
}

export interface SystemPermission {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  import: boolean;
  export: boolean;
  dashboard: boolean;
  directory: boolean;
  attendance: boolean;
  workflow: boolean;
  reports: boolean;
  userManagement: boolean;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: string; // custom role name assigned by Super Admin
  isActive: boolean;
  lastLogin?: string;
  customPermissions: SystemPermission;
  password?: string;
}

export interface SystemRole {
  id: string;
  name: string;
  permissions: SystemPermission;
}

export interface ExcelImportLog {
  id: string;
  dateTime: string;
  userEmail: string;
  fileName: string;
  recordCount: number;
  status: "Success" | "Failed";
  details: string;
}

export interface ExcelExportLog {
  id: string;
  dateTime: string;
  userEmail: string;
  exportType: "Sewadars" | "Attendance" | "Reports";
  recordCount: number;
  status: "Success" | "Failed";
}

export interface RecordChangeLog {
  id: string;
  dateTime: string;
  userEmail: string;
  recordId: string;
  recordType: "Sewadar" | "Document" | "Workflow";
  changeType: "Create" | "Update" | "Delete";
  fieldChanged: string;
  oldValue: string;
  newValue: string;
}

export interface AttendanceModLog {
  id: string;
  dateTime: string;
  userEmail: string;
  sewadarName: string;
  date: string;
  oldStatus: string;
  newStatus: string;
}

export interface LoginHistoryLog {
  id: string;
  dateTime: string;
  userEmail: string;
  status: "Success" | "Failed";
  ipAddress?: string;
  browser?: string;
}
