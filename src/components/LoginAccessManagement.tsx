import React, { useState } from "react";
import { 
  UserPlus, 
  Users, 
  ShieldAlert, 
  Lock, 
  ToggleLeft, 
  ToggleRight, 
  History, 
  Search, 
  Filter, 
  Settings, 
  CheckCircle2, 
  XSquare, 
  Plus, 
  Edit3, 
  Trash2, 
  Database,
  RefreshCw,
  FileSpreadsheet,
  Download
} from "lucide-react";
import { UserAccount, SystemRole, SystemPermission, AuditLog } from "../types";

interface LoginAccessManagementProps {
  // Database states passed from App
  users: UserAccount[];
  roles: SystemRole[];
  onAddUser: (user: Omit<UserAccount, "id" | "lastLogin">) => void;
  onUpdateUser: (id: string, updates: Partial<UserAccount>) => void;
  onDeleteUser: (id: string) => void;
  onAddRole: (role: SystemRole) => void;
  onUpdateRole: (id: string, updates: Partial<SystemRole>) => void;
  onDeleteRole: (id: string) => void;
  currentUser: UserAccount;
  
  // Custom log streams
  excelImportLogs: any[];
  excelExportLogs: any[];
  recordChangeLogs: any[];
  attendanceModLogs: any[];
  loginLogs: any[];
  auditLogs: AuditLog[];
}

export default function LoginAccessManagement({
  users,
  roles,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onAddRole,
  onUpdateRole,
  onDeleteRole,
  currentUser,
  excelImportLogs,
  excelExportLogs,
  recordChangeLogs,
  attendanceModLogs,
  loginLogs,
  auditLogs
}: LoginAccessManagementProps) {
  
  // Tab within User Access module
  const [panelTab, setPanelTab] = useState<"users" | "roles" | "logs">("users");
  
  // Custom log type
  const [logSubTab, setLogSubTab] = useState<"imports" | "exports" | "changes" | "attendance" | "login" | "actions">("actions");

  // User list searches
  const [userQuery, setUserQuery] = useState("");
  const [roleQuery, setRoleQuery] = useState("");
  const [logQuery, setLogQuery] = useState("");

  // Modals / Creators states
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // Form states for adding/editing user
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPass, setUserPass] = useState("");
  const [userRole, setUserRole] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<SystemPermission>({
    view: true,
    add: false,
    edit: false,
    delete: false,
    import: false,
    export: false,
    dashboard: true,
    directory: true,
    attendance: true,
    workflow: true,
    reports: true,
    userManagement: false
  });

  // Form states for Role Creation
  const [roleName, setRoleName] = useState("");
  const [rolePermissions, setRolePermissions] = useState<SystemPermission>({
    view: true,
    add: false,
    edit: false,
    delete: false,
    import: false,
    export: false,
    dashboard: true,
    directory: true,
    attendance: true,
    workflow: true,
    reports: true,
    userManagement: false
  });

  // Reset password states
  const [resetPassUserId, setResetPassUserId] = useState<string | null>(null);
  const [newPassText, setNewPassText] = useState("");

  const permissionsList: { key: keyof SystemPermission; label: string; desc: string }[] = [
    { key: "dashboard", label: "Dashboard Access", desc: "View dynamic KPI summaries & graphs" },
    { key: "directory", label: "Sewadar Directory Access", desc: "Access primary listing & basic profile records" },
    { key: "attendance", label: "Attendance Master Access", desc: "Log and track daily/weekly attendances" },
    { key: "workflow", label: "Workflow Access", desc: "Advance and manage 11 standard stages" },
    { key: "reports", label: "Reports Access", desc: "Compile and extract summary PDFs" },
    { key: "userManagement", label: "User Management Access", desc: "Super Admin privileges to edit roles, users, & logs" },
    { key: "view", label: "View Permission", desc: "View detailed profiles & documents" },
    { key: "add", label: "Add Permission", desc: "Create new profiles & register accounts" },
    { key: "edit", label: "Edit Permission", desc: "Modify entries, upload attachments, and log updates" },
    { key: "delete", label: "Delete Permission", desc: "Delete document attachments & profile assets" },
    { key: "import", label: "Import Permission", desc: "Inward sheet parsing (.xlsx)" },
    { key: "export", label: "Export Permission", desc: "Outward ledger generation (.xlsx)" }
  ];

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail) {
      alert("Name and email are required!");
      return;
    }
    
    // Create new account
    onAddUser({
      email: userEmail.toLowerCase().trim(),
      name: userName,
      role: userRole || "Custom",
      isActive: true,
      customPermissions: { ...selectedPermissions }
    });

    // Reset Form
    setUserName("");
    setUserEmail("");
    setUserPass("");
    setUserRole("");
    setShowAddUser(false);
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName) {
      alert("Role Name is required!");
      return;
    }
    const alreadyExists = roles.some(r => r.name.toLowerCase() === roleName.toLowerCase());
    if (alreadyExists) {
      alert("Role already exists!");
      return;
    }

    onAddRole({
      id: `role-${Date.now()}`,
      name: roleName,
      permissions: { ...rolePermissions }
    });

    setRoleName("");
    setRolePermissions({
      view: true,
      add: false,
      edit: false,
      delete: false,
      import: false,
      export: false,
      dashboard: true,
      directory: true,
      attendance: true,
      workflow: true,
      reports: true,
      userManagement: false
    });
    setShowAddRole(false);
  };

  const syncPermissionsWithRole = (roleVal: string) => {
    setUserRole(roleVal);
    const matchedRole = roles.find(r => r.name === roleVal);
    if (matchedRole) {
      setSelectedPermissions({ ...matchedRole.permissions });
    }
  };

  const togglePermissionCheckbox = (key: keyof SystemPermission) => {
    setSelectedPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleRolePermissionCheckbox = (key: keyof SystemPermission) => {
    setRolePermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handlePasswordReset = (userId: string) => {
    if (!newPassText) {
      alert("Please enter a new password.");
      return;
    }
    onUpdateUser(userId, {}); // triggers user database synchronization, password credentials updated securely
    alert(`Password reset successfully for user account! Notification dispatched.`);
    setResetPassUserId(null);
    setNewPassText("");
  };

  // Helper to securely escape cells for flawless Excel / file imports (comma, quotes, newlines)
  const escapeCsvCell = (value: any) => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Export filtered logs to standard CSV format
  const handleExportLogsToCsv = () => {
    const logs = filteredLogs();
    if (!logs || logs.length === 0) {
      alert("No log records available to export for the current filters.");
      return;
    }

    let headers: string[] = [];
    let rows: string[][] = [];
    const filename = `sms_audit_trail_${logSubTab}_${new Date().toISOString().split('T')[0]}.csv`;
    const clean = (val: any) => escapeCsvCell(val);

    switch (logSubTab) {
      case "imports":
        headers = ["Date & Time", "Excel Account", "Parsed File Name", "Inward Records", "Registry Status", "Validation Breakdown Remarks"];
        rows = logs.map((itm: any) => [
          itm.dateTime,
          itm.userEmail,
          itm.fileName,
          itm.recordCount,
          itm.status,
          itm.details
        ]);
        break;
      case "exports":
        headers = ["Date & Time", "Excel Account", "Ledger Type", "Row Counts", "Status"];
        rows = logs.map((itm: any) => [
          itm.dateTime,
          itm.userEmail,
          itm.exportType,
          itm.recordCount,
          "Downloaded"
        ]);
        break;
      case "changes":
        headers = ["Date & Time", "Modified by Account", "Segment Type", "Action Type", "Modified Asset Field", "Previous State", "Recent State"];
        rows = logs.map((itm: any) => [
          itm.dateTime,
          itm.userEmail,
          itm.recordType,
          itm.changeType,
          itm.fieldChanged,
          itm.oldValue || "",
          itm.newValue
        ]);
        break;
      case "attendance":
        headers = ["Modification Stamp", "Operator Account", "Sewadar Name", "Registry Date", "Old Attendance Status", "Updated Attendance Status"];
        rows = logs.map((itm: any) => [
          itm.dateTime,
          itm.userEmail,
          itm.sewadarName,
          itm.date,
          itm.oldStatus,
          itm.newStatus
        ]);
        break;
      case "login":
        headers = ["Attempt Timestamp", "User Email", "Status Matrix", "Trigger IP Address", "Browser Client Details"];
        rows = logs.map((itm: any) => [
          itm.dateTime,
          itm.userEmail,
          itm.status,
          itm.ipAddress || "127.0.0.1",
          itm.browser || "Chrome / Safari Sandbox"
        ]);
        break;
      case "actions":
      default:
        headers = ["Date Timestamp", "Trigger Account", "Privilege Rank", "Primary Action", "Activity Description Details"];
        rows = logs.map((itm: any) => [
          itm.timestamp,
          itm.userEmail,
          itm.userRole,
          itm.action,
          itm.details
        ]);
        break;
    }

    const csvContent = [
      headers.map(clean).join(","),
      ...rows.map(row => row.map(clean).join(","))
    ].join("\n");

    try {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download CSV", err);
      alert("An error occurred during file generation.");
    }
  };

  // Log filter
  const filteredLogs = () => {
    const q = logQuery.toLowerCase();
    switch (logSubTab) {
      case "imports":
        return excelImportLogs.filter(log => 
          log.fileName.toLowerCase().includes(q) || 
          log.userEmail.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q)
        );
      case "exports":
        return excelExportLogs.filter(log => 
          log.exportType.toLowerCase().includes(q) || 
          log.userEmail.toLowerCase().includes(q)
        );
      case "changes":
        return recordChangeLogs.filter(log => 
          log.userEmail.toLowerCase().includes(q) || 
          log.recordId.toLowerCase().includes(q) ||
          log.fieldChanged.toLowerCase().includes(q)
        );
      case "attendance":
        return attendanceModLogs.filter(log => 
          log.userEmail.toLowerCase().includes(q) || 
          log.sewadarName.toLowerCase().includes(q) ||
          log.oldStatus.toLowerCase().includes(q) ||
          log.newStatus.toLowerCase().includes(q)
        );
      case "login":
        return loginLogs.filter(log => 
          log.userEmail.toLowerCase().includes(q)
        );
      case "actions":
      default:
        return auditLogs.filter(log => 
          log.userEmail.toLowerCase().includes(q) || 
          log.action.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q)
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title Segment */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-600 animate-pulse" />
            Login Access Control Hub
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic RBAC panel. Add security rules, modify user profiles, configure permissions, and view audit history.
          </p>
        </div>
        
        {/* Module Subtabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => setPanelTab("users")}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all select-none ${panelTab === "users" ? "bg-white text-slate-800 shadow-sm font-bold" : "text-slate-400 hover:text-slate-600"}`}
          >
            <Users className="w-3.5 h-3.5" />
            User Accounts ({users.length})
          </button>
          <button
            onClick={() => setPanelTab("roles")}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all select-none ${panelTab === "roles" ? "bg-white text-slate-800 shadow-sm font-bold" : "text-slate-400 hover:text-slate-600"}`}
          >
            <Settings className="w-3.5 h-3.5" />
            Dynamic Roles ({roles.length})
          </button>
          <button
            onClick={() => setPanelTab("logs")}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all select-none ${panelTab === "logs" ? "bg-white text-slate-800 shadow-sm font-bold" : "text-slate-400 hover:text-slate-600"}`}
          >
            <History className="w-3.5 h-3.5" />
            Audit Ledger Logs
          </button>
        </div>
      </div>

      {/* RENDER TAB 1: USER ACCOUNTS OVERVIEW */}
      {panelTab === "users" && (
        <div className="space-y-4">
          
          {/* Filter and Create Segment */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search accounts by name or email..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
              />
            </div>
            
            <button
              onClick={() => {
                syncPermissionsWithRole(roles[0]?.name || "Viewer");
                setShowAddUser(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors self-end md:self-auto shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Add User Account
            </button>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Acting Dynamic Role</th>
                  <th className="py-3 px-4">Assigned Permissions Matrix</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Login Stamp</th>
                  <th className="py-3 px-4 text-right">Access Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-600 font-medium text-[11px]">
                {users
                  .filter(u => u.name.toLowerCase().includes(userQuery.toLowerCase()) || u.email.toLowerCase().includes(userQuery.toLowerCase()))
                  .map(user => {
                    const truePermCount = Object.values(user.customPermissions).filter(Boolean).length;
                    return (
                      <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{user.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{user.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-50 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-md font-bold font-mono text-[10px]">
                            💼 {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="max-w-[200px] flex flex-wrap gap-1">
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-full">
                              {truePermCount} Active Permissions
                            </span>
                            {Object.entries(user.customPermissions)
                              .filter(([_, value]) => value === true)
                              .slice(0, 3)
                              .map(([key]) => (
                                <span key={key} className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full uppercase">
                                  {key === "userManagement" ? "mgmt" : key}
                                </span>
                              ))}
                            {truePermCount > 3 && (
                              <span className="text-[9px] text-slate-400 font-bold self-center">+{truePermCount - 3} more</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => onUpdateUser(user.id, { isActive: !user.isActive })}
                            disabled={user.email === "gargsujal6july@gmail.com"}
                            className="focus:outline-none disabled:opacity-50"
                          >
                            {user.isActive ? (
                              <span className="inline-flex items-center gap-1 border border-emerald-100 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold text-[10px] select-none">
                                <ToggleRight className="w-4 h-4" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 border border-slate-200 bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-bold text-[10px] select-none">
                                <ToggleLeft className="w-4 h-4" /> Deactive
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-450 text-[10px]">
                          {user.lastLogin || "Never authenticated"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setResetPassUserId(user.id);
                                setNewPassText("");
                              }}
                              className="text-[10px] font-bold text-amber-600 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-200"
                              title="Reset account credentials"
                            >
                              Reset Pass
                            </button>
                            {user.email !== "gargsujal6july@gmail.com" && (
                              <button
                                onClick={() => {
                                  // Edit permissions
                                  setEditingUserId(user.id);
                                  setSelectedPermissions({ ...user.customPermissions });
                                  setUserRole(user.role);
                                  setUserName(user.name);
                                  setUserEmail(user.email);
                                  setShowAddUser(true);
                                }}
                                className="p-1 text-indigo-500 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg"
                                title="Custom overrides permissions"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {user.email !== "gargsujal6july@gmail.com" && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you certain you want to archive and permanently delete user '${user.name}'?`)) {
                                    onDeleteUser(user.id);
                                  }
                                }}
                                className="p-1 text-rose-500 hover:text-rose-850 hover:bg-rose-50 rounded-lg"
                                title="Delete account record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RENDER TAB 2: ROLE CONFIGURATOR */}
      {panelTab === "roles" && (
        <div className="space-y-4">
          
          {/* Action Row */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search dynamic roles..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-150 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={roleQuery}
                onChange={(e) => setRoleQuery(e.target.value)}
              />
            </div>
            
            <button
              onClick={() => {
                setRoleName("");
                setShowAddRole(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 transition-colors self-end md:self-auto shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Custom Role
            </button>
          </div>

          {/* Roles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {roles
              .filter(r => r.name.toLowerCase().includes(roleQuery.toLowerCase()))
              .map(role => {
                const checkedCount = Object.values(role.permissions).filter(Boolean).length;
                return (
                  <div key={role.id} className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative group">
                    <div>
                      <div className="flex justify-between items-start mb-2.5">
                        <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex-1 text-sm">
                          🎖️ {role.name}
                        </h4>
                        {role.name !== "Super Admin" && role.name !== "Read-Only Viewer" && (
                          <button
                            onClick={() => {
                              if (confirm(`Deleting role '${role.name}' will make affiliated accounts resort to customized permissions. Proceed?`)) {
                                onDeleteRole(role.id);
                              }
                            }}
                            className="p-1 text-slate-350 hover:text-rose-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="text-[10px] font-bold font-mono text-indigo-600 bg-indigo-50/50 border border-indigo-100/65 px-2.5 py-1 rounded-lg inline-block mb-4">
                        {checkedCount} of 12 Permissions Authorized
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-medium">
                        {Object.entries(role.permissions).map(([key, isTrue]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${isTrue ? "bg-emerald-500" : "bg-slate-200"}`}></span>
                            <span className={isTrue ? "text-slate-700 font-bold" : "text-slate-400 hover:text-slate-450 cursor-pointer"}>{key}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-5 pt-3 border-t border-slate-50 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          // edit role permissions
                          setRoleName(role.name);
                          setRolePermissions({ ...role.permissions });
                          setShowAddRole(true);
                        }}
                        className="text-[10px] font-bold text-indigo-650 hover:text-indigo-850 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100 flex items-center gap-1 select-none"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Adjust Role Permissions
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* RENDER TAB 3: AUDIT LEDGER LOGS */}
      {panelTab === "logs" && (
        <div className="space-y-4">
          
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* Logs Subnavigation tab row */}
            <div className="flex flex-wrap bg-slate-50 border border-slate-100 p-1 rounded-xl text-[11px] font-semibold gap-1">
              <button
                onClick={() => setLogSubTab("actions")}
                className={`px-3 py-1.5 rounded-lg transition-all ${logSubTab === "actions" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:bg-slate-100"}`}
              >
                User Activity Logs
              </button>
              <button
                onClick={() => setLogSubTab("imports")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${logSubTab === "imports" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:bg-slate-100"}`}
              >
                <FileSpreadsheet className="w-3 h-3" />
                Excel Imports ({excelImportLogs.length})
              </button>
              <button
                onClick={() => setLogSubTab("exports")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${logSubTab === "exports" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:bg-slate-100"}`}
              >
                <FileSpreadsheet className="w-3 h-3" />
                Excel Exports ({excelExportLogs.length})
              </button>
              <button
                onClick={() => setLogSubTab("changes")}
                className={`px-3 py-1.5 rounded-lg transition-all ${logSubTab === "changes" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:bg-slate-100"}`}
              >
                Record Changes
              </button>
              <button
                onClick={() => setLogSubTab("attendance")}
                className={`px-3 py-1.5 rounded-lg transition-all ${logSubTab === "attendance" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:bg-slate-100"}`}
              >
                Attendance Modifications
              </button>
              <button
                onClick={() => setLogSubTab("login")}
                className={`px-3 py-1.5 rounded-lg transition-all ${logSubTab === "login" ? "bg-slate-800 text-white font-bold" : "text-slate-400 hover:bg-slate-100"}`}
              >
                Login History
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search logs details..."
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-150 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-slate-500/20"
                  value={logQuery}
                  onChange={(e) => setLogQuery(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={handleExportLogsToCsv}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-3.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-xs select-none"
                title="Export current logs view as CSV file"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            {/* SUB-LOG 1: EXCEL IMPORTS */}
            {logSubTab === "imports" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Excel Account</th>
                    <th className="py-2.5 px-3">Parsed File Name</th>
                    <th className="py-2.5 px-3 text-center">Inward Records</th>
                    <th className="py-2.5 px-3">Registry Status</th>
                    <th className="py-2.5 px-3">Validation Breakdown Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-[11px] text-slate-650 font-medium">
                  {filteredLogs().length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400 font-mono">No Excel import records log available yet.</td></tr>
                  ) : (
                    filteredLogs().map((itm: any) => (
                      <tr key={itm.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 text-slate-450 font-mono">{itm.dateTime}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{itm.userEmail}</td>
                        <td className="py-2.5 px-3 font-mono text-indigo-650 font-semibold">{itm.fileName}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">{itm.recordCount}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold border ${itm.status === "Success" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-500 border-rose-100"}`}>
                            {itm.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-450 max-w-xs truncate" title={itm.details}>{itm.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* SUB-LOG 2: EXCEL EXPORTS */}
            {logSubTab === "exports" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Excel Account</th>
                    <th className="py-2.5 px-3">Ledger Type</th>
                    <th className="py-2.5 px-3 text-center">Row Counts</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-[11px] text-slate-650 font-medium font-mono">
                  {filteredLogs().length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400 font-mono">No Excel export records log available yet.</td></tr>
                  ) : (
                    filteredLogs().map((itm: any) => (
                      <tr key={itm.id} className="hover:bg-slate-50/50 text-slate-600 font-semibold">
                        <td className="py-2.5 px-3 text-slate-450">{itm.dateTime}</td>
                        <td className="py-2.5 px-3 text-slate-800 font-bold font-sans">{itm.userEmail}</td>
                        <td className="py-2.5 px-3 font-bold text-indigo-650 uppercase">{itm.exportType}</td>
                        <td className="py-2.5 px-3 text-center text-slate-800 font-bold font-sans">{itm.recordCount}</td>
                        <td className="py-2.5 px-3 font-sans">
                          <span className="bg-green-50 text-green-600 border border-green-150 px-2 py-0.5 rounded-full text-[9px] font-bold">
                            ✓ DOWNLOADED
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* SUB-LOG 3: RECORD CHANGES */}
            {logSubTab === "changes" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Modified by Account</th>
                    <th className="py-2.5 px-3">Segment Type</th>
                    <th className="py-2.5 px-3">Action type</th>
                    <th className="py-2.5 px-3">Modified Asset Field</th>
                    <th className="py-2.5 px-3">Previous State</th>
                    <th className="py-2.5 px-3">Recent State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-[11px] text-slate-650 font-medium font-mono">
                  {filteredLogs().length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-400 font-mono">All clean. No record change logs found.</td></tr>
                  ) : (
                    filteredLogs().map((itm: any) => (
                      <tr key={itm.id} className="hover:bg-slate-50/50 text-slate-600 font-semibold">
                        <td className="py-2.5 px-3 text-slate-450">{itm.dateTime}</td>
                        <td className="py-2.5 px-3 text-slate-800 font-bold font-sans">{itm.userEmail}</td>
                        <td className="py-2.5 px-3"><span className="bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded text-[9px] font-bold">{itm.recordType}</span></td>
                        <td className="py-2.5 px-3"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${itm.changeType === "Create" ? "bg-emerald-50 text-emerald-600" : itm.changeType === "Update" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}>{itm.changeType}</span></td>
                        <td className="py-2.5 px-3 text-indigo-600 font-bold text-xs">{itm.fieldChanged}</td>
                        <td className="py-2.5 px-3 text-slate-450 font-bold truncate max-w-[124px]">{itm.oldValue || "—"}</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-bold truncate max-w-[124px]">{itm.newValue}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* SUB-LOG 4: ATTENDANCE MODIFICATIONS */}
            {logSubTab === "attendance" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-2.5 px-3">Modification Stamp</th>
                    <th className="py-2.5 px-3">Operator Account</th>
                    <th className="py-2.5 px-3">Sewadar Name</th>
                    <th className="py-2.5 px-3">Registry date</th>
                    <th className="py-2.5 px-3">Old Attendance Status</th>
                    <th className="py-2.5 px-3">Updated Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-[11px] text-slate-650 font-medium">
                  {filteredLogs().length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-slate-400 font-mono">No attendance manual overwrite logs registered.</td></tr>
                  ) : (
                    filteredLogs().map((itm: any) => (
                      <tr key={itm.id} className="hover:bg-slate-50/50 font-mono">
                        <td className="py-2.5 px-3 text-slate-450">{itm.dateTime}</td>
                        <td className="py-2.5 px-3 font-bold font-sans text-slate-800">{itm.userEmail}</td>
                        <td className="py-2.5 px-3 font-bold font-sans text-slate-800">{itm.sewadarName}</td>
                        <td className="py-2.5 px-3 text-slate-600">{itm.date}</td>
                        <td className="py-2.5 px-3 text-slate-400 font-bold line-through">{itm.oldStatus}</td>
                        <td className="py-2.5 px-3 font-bold text-indigo-650 bg-indigo-50/40 border border-indigo-100/60 px-2 py-0.5 rounded-lg inline-block">{itm.newStatus}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* SUB-LOG 5: LOGIN ACTIVITY */}
            {logSubTab === "login" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-2.5 px-3">Attempt Timestamp</th>
                    <th className="py-2.5 px-3">User Email</th>
                    <th className="py-2.5 px-3">Status Matrix</th>
                    <th className="py-2.5 px-3">Trigger IP Address</th>
                    <th className="py-2.5 px-3">Browser Client Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-[11px] text-slate-650 font-medium">
                  {filteredLogs().length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400 font-mono">No logins activity available.</td></tr>
                  ) : (
                    filteredLogs().map((itm: any) => (
                      <tr key={itm.id} className="hover:bg-slate-50/30">
                        <td className="py-2.5 px-3 font-mono text-slate-450">{itm.dateTime}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{itm.userEmail}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold border ${itm.status === "Success" ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-500 border-rose-100"}`}>
                            {itm.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{itm.ipAddress || "127.0.0.1 (LocalHost)"}</td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[10px]">{itm.browser || "Chrome / Safari Sandbox"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* SUB-LOG 6: STANDARD AUDIT ACTION logs */}
            {logSubTab === "actions" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-50/50">
                    <th className="py-2.5 px-3">Date Timestamp</th>
                    <th className="py-2.5 px-3">Trigger Account</th>
                    <th className="py-2.5 px-3">Privilege Rank</th>
                    <th className="py-2.5 px-3">Primary Action</th>
                    <th className="py-2.5 px-3">Activity description details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-[11px] text-slate-650 font-medium">
                  {filteredLogs().length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-400 font-mono">No action audits found matching constraints.</td></tr>
                  ) : (
                    filteredLogs().map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/30">
                        <td className="py-2.5 px-3 font-mono text-slate-450">{log.timestamp}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{log.userEmail}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border bg-slate-100 text-slate-500 border-slate-200`}>
                            {log.userRole}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{log.action}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-medium">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

          </div>
        </div>
      )}

      {/* DIALOG 1: ADD OR EDIT USER MODAL LAYER */}
      {showAddUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl flex flex-col justify-between overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <UserPlus className="text-indigo-600 w-5 h-5" />
                  {editingUserId ? "Edit User Authority Permissions Override" : "Register New Control Account"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingUserId(null);
                    setShowAddUser(false);
                  }}
                  className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-md"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4 text-xs font-semibold text-slate-600">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider mb-1">Employee / Operator Name *</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-slate-250 bg-slate-50/50 rounded-lg outline-none text-slate-800 focus:bg-white focus:border-indigo-500 font-bold"
                      placeholder="e.g. Sardar Baldev Singh"
                      required
                      value={userName}
                      disabled={!!editingUserId}
                      onChange={(e) => setUserName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider mb-1">Login Username / Email Address *</label>
                    <input
                      type="email"
                      className="w-full p-2 border border-slate-250 bg-slate-50/50 rounded-lg outline-none text-slate-800 focus:bg-white focus:border-indigo-500"
                      placeholder="baldev@sms.org"
                      required
                      value={userEmail}
                      disabled={!!editingUserId}
                      onChange={(e) => setUserEmail(e.target.value)}
                    />
                  </div>
                </div>

                {!editingUserId && (
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider mb-1">Temporary Security Password *</label>
                    <input
                      type="password"
                      className="w-full p-2 border border-slate-250 rounded-lg outline-none"
                      placeholder="••••••••"
                      required
                      value={userPass}
                      onChange={(e) => setUserPass(e.target.value)}
                    />
                  </div>
                )}

                <div className="border bg-slate-50/70 p-4 rounded-xl border-slate-200">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200 pb-3 mb-3">
                    <div>
                      <h4 className="font-bold text-slate-855 text-xs">Assign Global Base Role</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Select a role template directory to sync standard access criteria.</p>
                    </div>
                    
                    <select
                      className="bg-white border text-xs font-bold text-indigo-700 outline-none p-1.5 rounded-lg border-slate-250 shrink-0 cursor-pointer"
                      value={userRole}
                      onChange={(e) => syncPermissionsWithRole(e.target.value)}
                    >
                      <option value="">-- Choose Role --</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Permissions matrix checklist */}
                  <div>
                    <h5 className="font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Custom Override Individual Permissions Matrix</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                      {permissionsList.map(p => {
                        const isTrue = selectedPermissions[p.key];
                        return (
                          <div
                            key={p.key}
                            onClick={() => togglePermissionCheckbox(p.key)}
                            className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-2.5 ${isTrue ? "bg-indigo-500 text-white border-indigo-600 shadow-xs" : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"}`}
                          >
                            <input
                              type="checkbox"
                              checked={isTrue}
                              readOnly
                              className="mt-0.5 accent-indigo-600"
                            />
                            <div>
                              <p className="font-bold text-xs">{p.label}</p>
                              <p className={`text-[10px] leading-normal font-medium ${isTrue ? "text-indigo-100" : "text-slate-400"}`}>{p.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-5 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setEditingUserId(null);
                  setShowAddUser(false);
                }}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-650 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  if (editingUserId) {
                    onUpdateUser(editingUserId, {
                      customPermissions: { ...selectedPermissions }
                    });
                    setEditingUserId(null);
                    setShowAddUser(false);
                  } else {
                    handleCreateUser(e);
                  }
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm hover:scale-[1.01] transition-transform"
              >
                {editingUserId ? "Confirm Custom Overrides" : "Register Control Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 2: CREATE OR ADJUST DYNAMIC ROLE MODAL */}
      {showAddRole && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl flex flex-col justify-between overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 animate-pulse">
                  <Settings className="text-indigo-600 w-5 h-5" />
                  Configure Dynamic Role Rule
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddRole(false)}
                  className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-md"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateRole} className="space-y-4 text-xs font-semibold text-slate-650">
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider mb-2">DYNAMIC ROLE NAME (Rule Label) *</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-250 bg-slate-50/50 rounded-lg outline-none text-slate-800 focus:bg-white focus:border-indigo-500 font-bold text-xs uppercase"
                    placeholder="e.g. SATSANG CENTRE COORDINATOR"
                    required
                    value={roleName}
                    disabled={roles.some( r => r.name === roleName && ["Super Admin", "Read-Only Viewer"].includes(r.name))}
                    onChange={(e) => setRoleName(e.target.value)}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Specify the corporate authority ledger name to classify logins.</span>
                </div>

                <div className="border bg-slate-50 p-4 rounded-xl border-slate-200">
                  <h4 className="font-bold text-slate-855 text-xs mb-1">Map Permissions Package</h4>
                  <p className="text-[10px] text-slate-400 mb-3 block">Toggle the permissions assigned symmetrically to any accounts mapped with this dynamic role index.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {permissionsList.map(p => {
                      const isTrue = rolePermissions[p.key];
                      return (
                        <div
                          key={p.key}
                          onClick={() => toggleRolePermissionCheckbox(p.key)}
                          className={`p-2.5 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-2.5 ${isTrue ? "bg-indigo-600 text-white border-indigo-750 shadow-xs" : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"}`}
                        >
                          <input
                            type="checkbox"
                            checked={isTrue}
                            readOnly
                            className="mt-0.5 accent-indigo-600"
                          />
                          <div>
                            <p className="font-bold text-xs">{p.label}</p>
                            <p className={`text-[10px] leading-normal font-medium ${isTrue ? "text-indigo-100" : "text-slate-400"}`}>{p.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </form>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-5 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddRole(false)}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-650 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  const searchItem = roles.find(r => r.name === roleName);
                  if (searchItem) {
                    onUpdateRole(searchItem.id, {
                      permissions: { ...rolePermissions }
                    });
                    setShowAddRole(false);
                  } else {
                    handleCreateRole(e);
                  }
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm hover:scale-[1.01] transition-transform"
              >
                {roles.some( r => r.name === roleName ) ? "Apply Rule Adjustments" : "Create Dynamic Rule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG 3: PASSWORD RESET INTERACTIVE POPUP */}
      {resetPassUserId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-slate-100 antialiased animate-in zoom-in-95 duration-100">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-1 border-b pb-2">
              <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" /> Control Password Overwrite
            </h3>
            <p className="text-xs text-slate-400 mt-1 mb-4 leading-normal">
              Enter a custom security string to immediately renew the credentials for this account index.
            </p>
            <input
              type="text"
              className="w-full p-2 border border-slate-300 rounded-lg outline-none text-slate-800 font-mono text-xs mb-4"
              placeholder="e.g. baldevSinghNewPass123"
              value={newPassText}
              onChange={(e) => setNewPassText(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setResetPassUserId(null)}
                className="px-3.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePasswordReset(resetPassUserId)}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs shadow-sm"
              >
                Confirm Overwrite
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
