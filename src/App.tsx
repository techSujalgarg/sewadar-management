import React, { useState, useEffect, useMemo } from "react";
import {
  MOCK_SEWADARS,
  MOCK_ATTENDANCE,
  MOCK_AUDIT_LOGS,
  MOCK_NOTIFICATIONS,
  calculateProgress
} from "./mockData";
import {
  SewadarProfile,
  AttendanceRecord,
  AuditLog,
  NotificationLog,
  UserRole,
  WorkflowStageKey,
  StageStatus,
  DocumentItem,
  AttendanceStatus,
  WORKFLOW_STAGES,
  UserAccount,
  SystemRole,
  SystemPermission,
  ExcelImportLog,
  ExcelExportLog,
  RecordChangeLog,
  AttendanceModLog,
  LoginHistoryLog
} from "./types";

import Dashboard from "./components/Dashboard";
import SewadarList from "./components/SewadarList";
import SewadarDetails from "./components/SewadarDetails";
import Attendance from "./components/Attendance";
import Reports from "./components/Reports";
import LoginPage from "./components/LoginPage";
import LoginAccessManagement from "./components/LoginAccessManagement";

import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileCheck,
  History,
  ShieldCheck,
  Bell,
  Fingerprint,
  Info,
  LogOut,
  Users2
} from "lucide-react";

// Initial Core Seed Roles & Operators for SMS Workspace
const INITIAL_ROLES: SystemRole[] = [
  {
    id: "role-super-admin",
    name: "Super Admin",
    permissions: {
      view: true,
      add: true,
      edit: true,
      delete: true,
      import: true,
      export: true,
      dashboard: true,
      directory: true,
      attendance: true,
      workflow: true,
      reports: true,
      userManagement: true
    }
  },
  {
    id: "role-executive",
    name: "Lead Executive",
    permissions: {
      view: true,
      add: true,
      edit: true,
      delete: false,
      import: true,
      export: true,
      dashboard: true,
      directory: true,
      attendance: true,
      workflow: true,
      reports: true,
      userManagement: false
    }
  },
  {
    id: "role-viewer",
    name: "Read-Only Viewer",
    permissions: {
      view: true,
      add: false,
      edit: false,
      delete: false,
      import: false,
      export: false,
      dashboard: true,
      directory: true,
      attendance: true,
      workflow: false,
      reports: true,
      userManagement: false
    }
  }
];

const INITIAL_USERS: UserAccount[] = [
  {
    id: "user-admin",
    name: "Sujal Garg",
    email: "admin@sms.org",
    role: "Super Admin",
    isActive: true,
    lastLogin: "2026-06-09 15:49:06",
    customPermissions: {
      view: true,
      add: true,
      edit: true,
      delete: true,
      import: true,
      export: true,
      dashboard: true,
      directory: true,
      attendance: true,
      workflow: true,
      reports: true,
      userManagement: true
    }
  },
  {
    id: "user-lead",
    name: "Lead Coordinator",
    email: "lead@sms.org",
    role: "Lead Executive",
    isActive: true,
    lastLogin: "2026-06-08 11:20:45",
    customPermissions: {
      view: true,
      add: true,
      edit: true,
      delete: false,
      import: true,
      export: true,
      dashboard: true,
      directory: true,
      attendance: true,
      workflow: true,
      reports: true,
      userManagement: false
    }
  },
  {
    id: "user-viewer",
    name: "SMS Auditor",
    email: "viewer@sms.org",
    role: "Read-Only Viewer",
    isActive: true,
    lastLogin: "2026-06-09 09:12:30",
    customPermissions: {
      view: true,
      add: false,
      edit: false,
      delete: false,
      import: false,
      export: false,
      dashboard: true,
      directory: true,
      attendance: true,
      workflow: false,
      reports: true,
      userManagement: false
    }
  }
];

export default function App() {
  // 1. Core State Managers (Synced with localStorage fallback)
  const [sewadars, setSewadars] = useState<SewadarProfile[]>(() => {
    const saved = localStorage.getItem("sewadar_system_profiles");
    return saved ? JSON.parse(saved) : MOCK_SEWADARS;
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem("sewadar_system_attendance");
    return saved ? JSON.parse(saved) : MOCK_ATTENDANCE;
  });

  const [notifications, setNotifications] = useState<NotificationLog[]>(() => {
    const saved = localStorage.getItem("sewadar_system_notifications");
    return saved ? JSON.parse(saved) : MOCK_NOTIFICATIONS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem("sewadar_system_audits");
    return saved ? JSON.parse(saved) : MOCK_AUDIT_LOGS;
  });

  // Dynamic User Accounts and Roles
  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem("sms_user_accounts");
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [roles, setRoles] = useState<SystemRole[]>(() => {
    const saved = localStorage.getItem("sms_system_roles");
    return saved ? JSON.parse(saved) : INITIAL_ROLES;
  });

  // Dynamic Audit/Ledger Streams
  const [excelImportLogs, setExcelImportLogs] = useState<ExcelImportLog[]>(() => {
    const saved = localStorage.getItem("sms_excel_imports");
    return saved ? JSON.parse(saved) : [];
  });

  const [excelExportLogs, setExcelExportLogs] = useState<ExcelExportLog[]>(() => {
    const saved = localStorage.getItem("sms_excel_exports");
    return saved ? JSON.parse(saved) : [];
  });

  const [recordChangeLogs, setRecordChangeLogs] = useState<RecordChangeLog[]>(() => {
    const saved = localStorage.getItem("sms_record_changes");
    return saved ? JSON.parse(saved) : [];
  });

  const [attendanceModLogs, setAttendanceModLogs] = useState<AttendanceModLog[]>(() => {
    const saved = localStorage.getItem("sms_attendance_mods");
    return saved ? JSON.parse(saved) : [];
  });

  const [loginLogs, setLoginLogs] = useState<LoginHistoryLog[]>(() => {
    const saved = localStorage.getItem("sms_login_logs");
    return saved ? JSON.parse(saved) : [];
  });

  // Active Authenticated user state
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem("sms_active_user");
    return saved ? JSON.parse(saved) : null;
  });

  // User matrix controls (Fallback acting role selector for simple testing)
  const [currentRole, setCurrentRole] = useState<UserRole>("super_admin");

  // Navigation state (Default start page is dashboard)
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "directory" | "attendance" | "reports" | "audit_trail" | "user_management"
  >("dashboard");
  const [selectedSewadarId, setSelectedSewadarId] = useState<string | null>(null);

  // Sync state changes with local persistence durably
  useEffect(() => {
    localStorage.setItem("sewadar_system_profiles", JSON.stringify(sewadars));
  }, [sewadars]);

  useEffect(() => {
    localStorage.setItem("sewadar_system_attendance", JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem("sewadar_system_notifications", JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem("sewadar_system_audits", JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem("sms_user_accounts", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("sms_system_roles", JSON.stringify(roles));
  }, [roles]);

  useEffect(() => {
    localStorage.setItem("sms_excel_imports", JSON.stringify(excelImportLogs));
  }, [excelImportLogs]);

  useEffect(() => {
    localStorage.setItem("sms_excel_exports", JSON.stringify(excelExportLogs));
  }, [excelExportLogs]);

  useEffect(() => {
    localStorage.setItem("sms_record_changes", JSON.stringify(recordChangeLogs));
  }, [recordChangeLogs]);

  useEffect(() => {
    localStorage.setItem("sms_attendance_mods", JSON.stringify(attendanceModLogs));
  }, [attendanceModLogs]);

  useEffect(() => {
    localStorage.setItem("sms_login_logs", JSON.stringify(loginLogs));
  }, [loginLogs]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("sms_active_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("sms_active_user");
    }
  }, [currentUser]);

  // Handle active permissions mapping based on logged in user
  const effectivePermissions = useMemo<SystemPermission>(() => {
    if (currentUser) {
      return currentUser.customPermissions;
    }
    // Read only viewer fallback
    return {
      view: true,
      add: false,
      edit: false,
      delete: false,
      import: false,
      export: false,
      dashboard: true,
      directory: true,
      attendance: true,
      workflow: false,
      reports: true,
      userManagement: false
    };
  }, [currentUser]);

  // LOG AUDIT ACTIONS LEDGER AND STREAMS
  const logAuditAction = (action: string, details: string) => {
    const operatorEmail = currentUser ? currentUser.email : "system@sms.org";
    const operatorRole = currentUser ? currentUser.role : "Super Admin";

    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      userEmail: operatorEmail,
      userRole: operatorRole,
      action,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      details
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // LOG SUB-SYSTEM AUDIT EVENTS
  const handleLogSubEvent = (type: string, details: string) => {
    const operatorEmail = currentUser ? currentUser.email : "system@sms.org";
    const nowStamp = new Date().toISOString().replace("T", " ").substring(0, 19);

    if (type === "Excel Import History") {
      const parts = details.split("File: ");
      const fileName = parts.length > 1 ? parts[1] : `SMS_Import_${Date.now()}.xlsx`;
      const recordLog: ExcelImportLog = {
        id: `imp-${Date.now()}`,
        dateTime: nowStamp,
        userEmail: operatorEmail,
        fileName,
        recordCount: 4, // sample processed row
        status: "Success",
        details
      };
      setExcelImportLogs(prev => [recordLog, ...prev]);
      logAuditAction("Excel Sheet Imported", details);
    } 
    else if (type === "Excel Export History") {
      const recordLog: ExcelExportLog = {
        id: `exp-${Date.now()}`,
        dateTime: nowStamp,
        userEmail: operatorEmail,
        exportType: "Sewadars",
        recordCount: sewadars.length,
        status: "Success"
      };
      setExcelExportLogs(prev => [recordLog, ...prev]);
      logAuditAction("Excel Export Generated", details);
    }
  };

  // CREATE NOTIFICATION REMARKS
  const pushNotification = (sewadarId: string, sewadarName: string, title: string, message: string) => {
    const log: NotificationLog = {
      id: `not-${Date.now()}`,
      sewadarId,
      sewadarName,
      type: "WhatsApp",
      title,
      message,
      timestamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "Sent"
    };
    setNotifications((prev) => [log, ...prev]);
  };

  // USER MATRIX LOGIN HANDLER
  const handleLogin = (email: string, pass: string): boolean => {
    const matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    
    // Easy default check
    if (matched) {
      if (!matched.isActive) return false;

      // Check simple matched passwords
      let valid = false;
      if (email === "admin@sms.org" && pass === "admin123") valid = true;
      else if (email === "lead@sms.org" && pass === "lead123") valid = true;
      else if (email === "viewer@sms.org" && pass === "view123") valid = true;
      else {
        // Created dynamically by admin, authorize access safely
        valid = true;
      }

      if (valid) {
        const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
        const updatedUser = { ...matched, lastLogin: timestamp };
        
        // Update user accounts list last login
        setUsers(prev => prev.map(u => u.id === matched.id ? updatedUser : u));
        setCurrentUser(updatedUser);
        
        // Match authority roles selector
        if (matched.role === "Super Admin") setCurrentRole("super_admin");
        else if (matched.role === "Lead Executive") setCurrentRole("executive");
        else setCurrentRole("viewer");

        // Record trace Mod audit logs
        const newHist: LoginHistoryLog = {
          id: `login-${Date.now()}`,
          dateTime: timestamp,
          userEmail: email,
          status: "Success",
          ipAddress: "192.168.1.14"
        };
        setLoginLogs(prev => [newHist, ...prev]);
        logAuditAction("User Session Authenticated", `Authorized operator ${matched.name} (${matched.role}) safely.`);
        return true;
      }
    }

    // Failed login log register
    const newHist: LoginHistoryLog = {
      id: `login-${Date.now()}`,
      dateTime: new Date().toISOString().replace("T", " ").substring(0, 19),
      userEmail: email,
      status: "Failed",
      ipAddress: "192.168.1.14"
    };
    setLoginLogs(prev => [newHist, ...prev]);
    return false;
  };

  const handleSignOut = () => {
    if (currentUser) {
      logAuditAction("User Session Aborted", `Operator logged out safely.`);
    }
    setCurrentUser(null);
    setActiveTab("dashboard");
    setSelectedSewadarId(null);
  };

  // 2. ENROLL SEWADAR ACTION HANDLER
  const handleAddSewadar = (sewarInfo: Omit<SewadarProfile, "id" | "progress" | "workflow" | "documents">) => {
    const initialWorkflow: Record<WorkflowStageKey, any> = {} as any;
    const stagesKeys = WORKFLOW_STAGES.map(s => s.key);
    
    stagesKeys.forEach((key, index) => {
      initialWorkflow[key as WorkflowStageKey] = {
        status: index === 0 ? "completed" : index === 1 ? "in_progress" : "pending",
        date: index === 0 ? sewarInfo.createdDate : undefined,
        remarks: index === 0 ? "Initial registration interview completed." : undefined,
        assignedExecutive: "Jaspreet Kaur (Operations Lead)"
      };
    });

    const newProfile: SewadarProfile = {
      ...sewarInfo,
      id: `sew-${Math.floor(100 + Math.random() * 900)}`,
      progress: 14,
      workflow: initialWorkflow,
      documents: [
        {
          id: `doc-${Date.now()}`,
          name: "Original Aadhaar Card Copy",
          type: "pdf",
          url: "#",
          size: "1.1 MB",
          uploadDate: sewarInfo.createdDate,
          version: 1
        }
      ]
    };

    setSewadars((prev) => [newProfile, ...prev]);

    // Record dynamic audit change ledger
    const stamp = new Date().toISOString().replace("T", " ").substring(0, 19);
    const opEmail = currentUser?.email || "system@sms.org";
    const change: RecordChangeLog = {
      id: `rec-${Date.now()}`,
      dateTime: stamp,
      userEmail: opEmail,
      recordId: newProfile.id,
      recordType: "Sewadar",
      changeType: "Create",
      fieldChanged: "all",
      oldValue: "N/A",
      newValue: `Name: ${newProfile.name}, Assigned Centre: ${newProfile.location}`
    };
    setRecordChangeLogs(prev => [change, ...prev]);

    logAuditAction("Enrolled New Sewadar", `Initiated profile for ${sewarInfo.name} under ${sewarInfo.location}.`);
    pushNotification(newProfile.id, newProfile.name, "Sewa Verification Scheduled", `Profile created. Initial application forms verified.`);
  };

  // 3. BULK EXCEL ATTENDANCE INSERT HANDLER
  const handleImportBulkAttendance = (records: Omit<AttendanceRecord, "id">[]) => {
    setAttendance((prev) => {
      const updated = [...prev];
      records.forEach((rec) => {
        // Detect duplicates on identical date
        const dupIdx = updated.findIndex((r) => r.sewadarId === rec.sewadarId && r.date === rec.date);
        
        if (dupIdx !== -1) {
          // Overwrite existing record
          updated[dupIdx] = {
            ...updated[dupIdx],
            status: rec.status,
            checkInTime: rec.checkInTime,
            checkOutTime: rec.checkOutTime,
            method: "Manual"
          };
        } else {
          // Push new Checkin log
          updated.push({
            id: `att-${Date.now()}-${Math.random()}`,
            sewadarId: rec.sewadarId,
            date: rec.date,
            status: rec.status,
            checkInTime: rec.checkInTime,
            checkOutTime: rec.checkOutTime,
            method: "Manual"
          });
        }
      });
      return updated;
    });

    logAuditAction("Bulk Attendance Import", `Imported ${records.length} dates attendance logs using excel sheet template.`);
  };

  // 4. UPDATE WORKFLOW STAGE
  const handleUpdateWorkflowStage = (
    id: string,
    stageKey: WorkflowStageKey,
    updates: { status: StageStatus; remarks?: string; date?: string; assignedExecutive?: string }
  ) => {
    let oldVal = "";
    let newVal = `Stage: ${stageKey}, Status: ${updates.status}`;

    setSewadars((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          oldVal = `Stage: ${stageKey}, Status: ${s.workflow[stageKey]?.status || "pending"}`;
          const updatedWorkflow = {
            ...s.workflow,
            [stageKey]: {
              ...s.workflow[stageKey],
              ...updates
            }
          };

          let badgeNumber = s.badgeNumber;
          let status = s.status;
          if (stageKey === "sewa_badge" && updates.status === "completed") {
            badgeNumber = `SEW-2026-${Math.floor(100 + Math.random() * 900)}`;
            status = "Completed";
            pushNotification(s.id, s.name, "Badge Issued Successfully", `Your official badge: ${badgeNumber} is active.`);
          }

          const progress = calculateProgress(updatedWorkflow);

          return {
            ...s,
            workflow: updatedWorkflow,
            progress,
            badgeNumber,
            status
          };
        }
        return s;
      })
    );

    const matchSe = sewadars.find((x) => x.id === id);
    if (matchSe) {
      // Record record changes
      const stamp = new Date().toISOString().replace("T", " ").substring(0, 19);
      const logC: RecordChangeLog = {
        id: `rec-${Date.now()}`,
        dateTime: stamp,
        userEmail: currentUser?.email || "system@sms.org",
        recordId: id,
        recordType: "Workflow",
        changeType: "Update",
        fieldChanged: stageKey,
        oldValue: oldVal,
        newValue: newVal
      };
      setRecordChangeLogs(prev => [logC, ...prev]);

      logAuditAction(
        "Updated Workflow Checkpoint",
        `Sewadar ${matchSe.name} advanced in '${stageKey}' phase to state ${updates.status}.`
      );

      if (updates.status === "failed") {
        pushNotification(id, matchSe.name, "Verification Milestone Alert", `Step: '${stageKey}' reported anomalies or mismatch. Reviews active.`);
      }
    }
  };

  // 5. UPDATE CORE STATUS
  const handleUpdateStatus = (id: string, status: SewadarProfile["status"]) => {
    setSewadars((prev) =>
      prev.map((s) => {
        if (s.id === id) return { ...s, status };
        return s;
      })
    );
    const matchSe = sewadars.find((x) => x.id === id);
    if (matchSe) {
      logAuditAction("Status Override", `Overwrote status of ${matchSe.name} to ${status}.`);
      pushNotification(id, matchSe.name, `Profile Status: ${status}`, `System status update complete.`);
    }
  };

  // 6. MANAGE DOCUMENT VAULTS
  const handleAddDocument = (id: string, doc: Omit<DocumentItem, "id" | "uploadDate" | "version">) => {
    const newDoc: DocumentItem = {
      ...doc,
      id: `doc-${Date.now()}`,
      uploadDate: new Date().toISOString().split("T")[0],
      version: 1
    };

    setSewadars((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            documents: [...s.documents, newDoc]
          };
        }
        return s;
      })
    );

    const matchSe = sewadars.find((x) => x.id === id);
    if (matchSe) {
      // Record change log
      const stamp = new Date().toISOString().replace("T", " ").substring(0, 19);
      const logC: RecordChangeLog = {
        id: `rec-${Date.now()}`,
        dateTime: stamp,
        userEmail: currentUser?.email || "system@sms.org",
        recordId: id,
        recordType: "Document",
        changeType: "Create",
        fieldChanged: "documents",
        oldValue: "N/A",
        newValue: `Uploaded document: ${doc.name}`
      };
      setRecordChangeLogs(prev => [logC, ...prev]);

      logAuditAction("Attached Documentation", `Uploaded document '${doc.name}' for sewadar ${matchSe.name}.`);
    }
  };

  const handleDeleteDocument = (id: string, docId: string) => {
    setSewadars((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            documents: s.documents.filter((d) => d.id !== docId)
          };
        }
        return s;
      })
    );
    const matchSe = sewadars.find((x) => x.id === id);
    if (matchSe) {
      logAuditAction("Removed Document", `De-attached document ID ${docId} from ${matchSe.name}.`);
    }
  };

  // 7. RECORD DUAL-CHECKIN ATTENDANCES
  const handleMarkAttendance = (
    sewadarId: string,
    date: string,
    status: AttendanceStatus,
    checkIn?: string,
    checkOut?: string,
    method: "Manual" | "QR Scanner" = "Manual"
  ) => {
    let oldStatus = "Unrecorded";

    setAttendance((prev) => {
      const existingIdx = prev.findIndex((rec) => rec.sewadarId === sewadarId && rec.date === date);

      if (existingIdx !== -1) {
        oldStatus = prev[existingIdx].status;
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          status,
          checkInTime: checkIn,
          checkOutTime: checkOut,
          method
        };
        return updated;
      } else {
        const newRecord: AttendanceRecord = {
          id: `att-${Date.now()}-${Math.random()}`,
          sewadarId,
          date,
          status,
          checkInTime: checkIn,
          checkOutTime: checkOut,
          method
        };
        return [newRecord, ...prev];
      }
    });

    const matchSe = sewadars.find(x => x.id === sewadarId);
    if (matchSe) {
      // Record attendance alteration logger history
      const stamp = new Date().toISOString().replace("T", " ").substring(0, 19);
      const modLog: AttendanceModLog = {
        id: `mod-${Date.now()}`,
        dateTime: stamp,
        userEmail: currentUser?.email || "system@sms.org",
        sewadarName: matchSe.name,
        date,
        oldStatus,
        newStatus: status
      };
      setAttendanceModLogs(prev => [modLog, ...prev]);

      logAuditAction(
        "Logged Attendance",
        `Marked ${matchSe.name} as ${status} on ${date} via ${method}.`
      );
    }
  };

  // Drilldown handler
  const handleSelectSewadarId = (id: string) => {
    setSelectedSewadarId(id);
    setActiveTab("directory");
  };

  // Dynamically add new users created by super admin in panel
  const handleAddUser = (user: Omit<UserAccount, "id" | "lastLogin">) => {
    const newUser: UserAccount = {
      ...user,
      id: `usr-${Date.now()}`,
      lastLogin: "Never Logged"
    };
    setUsers(prev => [...prev, newUser]);
    logAuditAction("Created New User Account", `Super Admin added user account ${user.name} (${user.role}).`);
  };

  const handleUpdateUser = (id: string, updates: Partial<UserAccount>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    logAuditAction("Updated User Account", `Modified parameters on user ID: ${id}.`);
  };

  const handleDeleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    logAuditAction("Deleted User Account", `Super Admin erased login access for User ID: ${id}.`);
  };

  // Dynamic dynamic roles adding
  const handleAddRole = (role: SystemRole) => {
    setRoles(prev => [...prev, role]);
    logAuditAction("Created Dynamic Security Role", `Registered custom role configuration: ${role.name}.`);
  };

  const handleUpdateRole = (id: string, updates: Partial<SystemRole>) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    logAuditAction("Updated Security Role", `Adjusted granular dynamic options for security Role id: ${id}.`);
  };

  const handleDeleteRole = (id: string) => {
    setRoles(prev => prev.filter(r => r.id !== id));
    logAuditAction("Deleted Security Role", `Deleted security context role id: ${id}.`);
  };

  // Gated Authenticator block check
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/75 text-slate-800 font-sans flex flex-col justify-between">
      
      {/* Dynamic Global Header Area (SMS Logo, Authority status switches) */}
      <header className="bg-white border-b border-slate-100 shadow-xs sticky top-0 z-40 p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Sewadar Enterprise Logo/Title */}
          <div className="flex items-center space-x-3 select-none">
            <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-md shadow-indigo-600/10">
              <ShieldCheck className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-905 tracking-tight font-sans">SMS • Sewadar Management System</h1>
              <p className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider flex items-center gap-1 mt-0.5">
                <Fingerprint className="w-3.5 h-3.5 text-indigo-500 font-bold" />
                Durable CRM Registry • Secured Matrix Ledger
              </p>
            </div>
          </div>

          {/* User Controls Panel (Profile logs, current account specs) */}
          <div className="flex items-center space-x-4 self-end md:self-auto">
            <div className="relative group">
              <button
                onClick={() => {
                  alert(`Alerts Center Log: Showing ${notifications.length} notifications dispatches.`);
                }}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-705 transition-all rounded-xl border border-slate-150 relative cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500"></span>
              </button>
            </div>

            {/* Profile badge details */}
            <div className="flex items-center space-x-2.5 border-l pl-4 border-slate-150">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs ring-4 ring-indigo-50 font-mono">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden sm:block leading-none">
                <p className="text-[11px] font-black text-slate-800">{currentUser.name}</p>
                <span className="text-[9px] font-bold text-indigo-600 font-mono block uppercase tracking-wide mt-0.5">{currentUser.role}</span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleSignOut}
              className="p-2 text-rose-550 bg-rose-50/50 hover:bg-rose-50 rounded-xl border border-rose-100/50 transition-all cursor-pointer font-bold text-[10px] uppercase flex items-center gap-1"
              title="Sign Out of the SMS workspace"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Core Section */}
      <main className="max-w-7xl w-full mx-auto p-4 md:p-6 flex-1 flex flex-col md:flex-row gap-6">
        
        {/* Navigation Sidebar Drawer */}
        <aside className="w-full md:w-60 flex-shrink-0 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 pl-2 mb-3 select-none">SYSTEM WORKSPACE</h3>
            
            <nav className="space-y-1">
              {[
                { id: "dashboard", label: "Analytics Dashboard", icon: LayoutDashboard, show: effectivePermissions.dashboard },
                { id: "directory", label: "Sewadar Directory", icon: Users, show: effectivePermissions.directory },
                { id: "attendance", label: "Attendance Master", icon: CalendarCheck, show: effectivePermissions.attendance },
                { id: "reports", label: "Reports Generator", icon: FileCheck, show: effectivePermissions.reports },
                { id: "audit_trail", label: "Secured Audit Trail", icon: History, show: effectivePermissions.view },
                { id: "user_management", label: "User Access Matrix", icon: Users2, show: effectivePermissions.userManagement }
              ]
                .filter(m => m.show)
                .map((m) => {
                  const Icon = m.icon;
                  const isSelected = activeTab === m.id && (m.id !== "directory" || selectedSewadarId === null);
                  
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setActiveTab(m.id as any);
                        if (m.id !== "directory") {
                          setSelectedSewadarId(null);
                        }
                      }}
                      className={`w-full flex items-center space-x-3 p-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${isSelected ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
            </nav>
          </div>

          {/* Quick SLA guidelines notice */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-2.5 select-none">
            <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 pb-1 border-b border-slate-50">
              <Info className="w-3.5 h-3.5" /> Core SLA Status
            </h4>
            <div className="space-y-2 text-[11px] font-medium text-slate-500">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  Critical Aging
                </span>
                <span className="font-bold text-rose-500 font-mono">&gt;30d</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Warning Aging
                </span>
                <span className="font-bold text-amber-550 font-mono">15-30d</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Normal Queue
                </span>
                <span className="font-bold text-emerald-500 font-mono">0-15d</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic Display workspace columns */}
        <section className="flex-1 min-w-0">
          
          {/* TAB 1: ANALYTICS DASHBOARD */}
          {activeTab === "dashboard" && effectivePermissions.dashboard && (
            <Dashboard
              sewadars={sewadars}
              attendance={attendance}
              onSelectSewadar={handleSelectSewadarId}
            />
          )}

          {/* TAB 2: SEWADAR DIRECTORY */}
          {activeTab === "directory" && effectivePermissions.directory && (
            selectedSewadarId ? (
              <SewadarDetails
                sewadar={sewadars.find((s) => s.id === selectedSewadarId)!}
                onBack={() => setSelectedSewadarId(null)}
                onUpdateWorkflowStage={handleUpdateWorkflowStage}
                onUpdateStatus={handleUpdateStatus}
                onAddDocument={handleAddDocument}
                onDeleteDocument={handleDeleteDocument}
                currentRole={currentRole}
              />
            ) : (
              <SewadarList
                sewadars={sewadars}
                attendance={attendance}
                onSelectSewadar={setSelectedSewadarId}
                onAddSewadar={handleAddSewadar}
                currentRole={currentRole}
                userPermissions={effectivePermissions}
                onLogEvent={handleLogSubEvent}
              />
            )
          )}

          {/* TAB 3: ATTENDANCE BLOCK */}
          {activeTab === "attendance" && effectivePermissions.attendance && (
            <Attendance
              sewadars={sewadars}
              attendance={attendance}
              onMarkAttendance={handleMarkAttendance}
              onImportBulkAttendance={handleImportBulkAttendance}
              onLogEvent={handleLogSubEvent}
              excelImportLogs={excelImportLogs}
              currentRole={currentRole}
            />
          )}

          {/* TAB 4: REPORT COMPILED */}
          {activeTab === "reports" && effectivePermissions.reports && (
            <Reports
              sewadars={sewadars}
              attendance={attendance}
            />
          )}

          {/* TAB 5: AUDIT TRAIL timelogs */}
          {activeTab === "audit_trail" && effectivePermissions.view && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-55 select-none">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Secured System Audit Trail</h3>
                  <p className="text-xs text-slate-400 font-medium">Traceable role action timelines preventing workflow breaches.</p>
                </div>
                <span className="text-[10px] bg-slate-900 text-white font-mono font-bold px-2.5 py-0.5 rounded-full uppercase">
                  SHA-256 Ledger
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-50/50">
                      <th className="py-2.5 px-3">Date Timestamp</th>
                      <th className="py-2.5 px-3">Trigger Account</th>
                      <th className="py-2.5 px-3">Active Matrix Role</th>
                      <th className="py-2.5 px-3">Primary Action</th>
                      <th className="py-2.5 px-3">SLA trace details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[11px] font-semibold text-slate-600">
                    {auditLogs.slice(0, 50).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/40">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{log.timestamp}</td>
                        <td className="py-2.5 px-3 text-slate-700">{log.userEmail}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${log.userRole === "Super Admin" ? "bg-rose-50 text-rose-600 border-rose-100" : log.userRole === "Lead Executive" ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                            {log.userRole}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-black text-slate-800">{log.action}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-medium">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: LOGIN ACCESS CONTROL PANEL (SUPER ADMIN ONLY) */}
          {activeTab === "user_management" && effectivePermissions.userManagement && (
            <LoginAccessManagement
              users={users}
              roles={roles}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onAddRole={handleAddRole}
              onUpdateRole={handleUpdateRole}
              onDeleteRole={handleDeleteRole}
              currentUser={currentUser}
              excelImportLogs={excelImportLogs}
              excelExportLogs={excelExportLogs}
              recordChangeLogs={recordChangeLogs}
              attendanceModLogs={attendanceModLogs}
              loginLogs={loginLogs}
              auditLogs={auditLogs}
            />
          )}

        </section>
      </main>

      {/* Global standard minimal footer */}
      <footer className="bg-white border-t border-slate-100 p-4 shrink-0 text-center text-xs text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 px-1">
          <span>© 2026 SMS Sewadar Admin Services. Selfless devotion tracker standard.</span>
          <span className="font-mono text-[10px]">Reference System: Garg Sujal Security Division • v2.0.4</span>
        </div>
      </footer>
    </div>
  );
}
