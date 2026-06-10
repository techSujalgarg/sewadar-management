import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  SlidersHorizontal,
  LayoutGrid,
  List,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  MapPin,
  FileBadge,
  Sparkles,
  Download,
  Calendar,
  Layers,
  Award
} from "lucide-react";
import { SewadarProfile, EnrollmentType, SewadarStatus, WorkflowStageKey, StageStatus, AttendanceRecord } from "../types";
import { LOCATIONS, EXECUTIVES } from "../mockData";
import { exportToExcel } from "../utils/excel";

interface SewadarListProps {
  sewadars: SewadarProfile[];
  attendance: AttendanceRecord[];
  onSelectSewadar: (id: string) => void;
  onAddSewadar: (sewadar: Omit<SewadarProfile, "id" | "progress" | "workflow" | "documents">) => void;
  currentRole: string; // Dynamic roles supported now
  userPermissions: any; // Dynamic permissions
  onLogEvent: (type: string, details: string) => void;
}

const CHECKPOINTS_STAGES = [
  { key: "initial_interview", label: "Initial Interview" },
  { key: "application_form", label: "Application Form" },
  { key: "meeting_hod", label: "Meeting HOD" },
  { key: "verification", label: "Verification" },
  { key: "temporary_number", label: "Temp Issue" },
  { key: "probation", label: "Probation" },
  { key: "sewa_samiti_form", label: "Samiti Form" },
  { key: "document_verification", label: "Docs Verification" },
  { key: "medical", label: "Medical" },
  { key: "submission", label: "Submission" },
  { key: "sewa_badge", label: "Badge Issue" }
] as const;

export default function SewadarList({ 
  sewadars, 
  attendance, 
  onSelectSewadar, 
  onAddSewadar, 
  currentRole,
  userPermissions,
  onLogEvent
}: SewadarListProps) {
  
  // View states
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Search/Filters states
  const [searchText, setSearchText] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [selectedArea, setSelectedArea] = useState("All");
  const [selectedSewaType, setSelectedSewaType] = useState("All");
  const [selectedEnrollmentType, setSelectedEnrollmentType] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  
  // Checklist Workflow filter
  const [selectedWorkflowStage, setSelectedWorkflowStage] = useState<string>("All");
  const [selectedWorkflowStatus, setSelectedWorkflowStatus] = useState<string>("All");

  // Attendance Status filter on specific Date
  const [selectedAttDate, setSelectedAttDate] = useState("2026-06-05");
  const [selectedAttStatus, setSelectedAttStatus] = useState("All");

  // Joining Range & Demographics
  const [createdStart, setCreatedStart] = useState("");
  const [createdEnd, setCreatedEnd] = useState("");
  const [selectedGender, setSelectedGender] = useState("All");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState("All"); // Youth (<30), Middle (30-50), Senior (>50)

  // New Sewadar form state
  const [newName, setNewName] = useState("");
  const [newEnrollType, setNewEnrollType] = useState<EnrollmentType>("New");
  const [newGender, setNewGender] = useState<"Male" | "Female" | "Other">("Male");
  const [newContact, setNewContact] = useState("");
  const [newEmergency, setNewEmergency] = useState("");
  const [newDob, setNewDob] = useState("1995-01-01");
  const [newLocation, setNewLocation] = useState(LOCATIONS[0]);
  const [newArea, setNewArea] = useState("Sector-A");
  const [newSewaType, setNewSewaType] = useState("Kitchen (Langar)");
  const [newAddress, setNewAddress] = useState("");
  const [newPhoto, setNewPhoto] = useState("");

  const canAdd = userPermissions?.add !== false;
  const canExport = userPermissions?.export !== false;

  // Age calculations
  const getAge = (dobString: string) => {
    if (!dobString) return 0;
    const birth = new Date(dobString);
    const now = new Date("2026-06-09T15:49:06Z"); 
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getAgeGroupLabel = (dobString: string) => {
    const age = getAge(dobString);
    if (age < 30) return "Youth (<30)";
    if (age <= 50) return "Middle-Aged (30-50)";
    return "Senior (>50)";
  };

  // Calculate Aging category (Critical: >30, Warning: 15-30, Normal: 0-15)
  const getAgingInfo = (createdDateStr: string, status: SewadarStatus) => {
    if (status === "Completed") return { days: 0, category: "Completed", color: "bg-emerald-55 text-emerald-600 border-emerald-100" };
    const now = new Date("2026-06-09T15:49:06Z");
    const created = new Date(createdDateStr);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (days > 30) {
      return { days, category: "Critical", color: "bg-rose-50 text-rose-600 border-rose-200" };
    } else if (days >= 15) {
      return { days, category: "Warning", color: "bg-amber-50 text-amber-600 border-amber-200" };
    } else {
      return { days, category: "Normal", color: "bg-green-55 text-green-600 border-green-200" };
    }
  };

  // Extract unique Areas & Sewatypes dynamically from dataset
  const dynamicAreas = useMemo(() => {
    const set = new Set<string>();
    sewadars.forEach((s) => { if (s.area) set.add(s.area); });
    return Array.from(set);
  }, [sewadars]);

  const dynamicSewaTypes = useMemo(() => {
    const set = new Set<string>();
    sewadars.forEach((s) => { if (s.sewaType) set.add(s.sewaType); });
    return Array.from(set);
  }, [sewadars]);

  // Filter & Search Logic
  const filteredSewadars = useMemo(() => {
    return sewadars.filter((s) => {
      // 1. Text Search
      const searchMatch =
        s.name.toLowerCase().includes(searchText.toLowerCase()) ||
        s.badgeNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        s.tempNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        s.contactNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        s.location.toLowerCase().includes(searchText.toLowerCase());

      if (!searchMatch) return false;

      // 2. Satsang Centre (Mapped to location)
      if (selectedLocation !== "All" && s.location !== selectedLocation) return false;

      // 3. Area
      if (selectedArea !== "All" && s.area !== selectedArea) return false;

      // 4. Sewa Type
      if (selectedSewaType !== "All" && s.sewaType !== selectedSewaType) return false;

      // 5. Enrollment Type
      if (selectedEnrollmentType !== "All" && s.enrollmentType !== selectedEnrollmentType) return false;

      // 6. Active/Inactive Status
      if (selectedStatus !== "All" && s.status !== selectedStatus) return false;

      // 7. Workflow Checkpoints & Stage Status
      if (selectedWorkflowStage !== "All") {
        const stageProg = s.workflow[selectedWorkflowStage as WorkflowStageKey];
        if (!stageProg) return false;
        if (selectedWorkflowStatus !== "All" && stageProg.status !== selectedWorkflowStatus) return false;
      }

      // 8. Attendance Status on Selected Date
      if (selectedAttStatus !== "All") {
        const attRec = attendance.find(a => a.sewadarId === s.id && a.date === selectedAttDate);
        const actualStatus = attRec?.status || "Absent"; // default unrecorded to absent
        if (actualStatus !== selectedAttStatus) return false;
      }

      // 9. Gender filter
      if (selectedGender !== "All" && s.gender !== selectedGender) return false;

      // 10. Age Group
      if (selectedAgeGroup !== "All") {
        const gLabel = getAgeGroupLabel(s.dob);
        if (gLabel !== selectedAgeGroup) return false;
      }

      // 11. Joining date range
      if (createdStart && s.createdDate < createdStart) return false;
      if (createdEnd && s.createdDate > createdEnd) return false;

      return true;
    });
  }, [
    sewadars, 
    searchText, 
    selectedLocation, 
    selectedArea, 
    selectedSewaType, 
    selectedEnrollmentType, 
    selectedStatus, 
    selectedWorkflowStage,
    selectedWorkflowStatus,
    selectedAttDate,
    selectedAttStatus,
    selectedGender,
    selectedAgeGroup,
    createdStart,
    createdEnd,
    attendance
  ]);

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newContact) {
      alert("Name and Contact Number are required!");
      return;
    }

    onAddSewadar({
      name: newName,
      badgeNumber: "", 
      tempNumber: `TEMP-2026-${Math.floor(100 + Math.random() * 900)}`, 
      enrollmentType: newEnrollType,
      contactNumber: newContact,
      emergencyContact: newEmergency || "+91 XXXXX XXXXX",
      gender: newGender,
      dob: newDob,
      address: newAddress || "Sewa Center Address Records",
      location: newLocation,
      area: newArea,
      sewaType: newSewaType,
      photographUrl: newPhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      status: "Active",
      createdDate: new Date().toISOString().split("T")[0] // today standard
    });

    // Reset fields & Close Drawers
    setNewName("");
    setNewGender("Male");
    setNewContact("");
    setNewEmergency("");
    setNewAddress("");
    setNewPhoto("");
    setShowAddForm(false);
  };

  // EXCEL EXPORT DIRECTORY HANDLER
  const handleExport = (exportFilteredOnly: boolean) => {
    const listToExport = exportFilteredOnly ? filteredSewadars : sewadars;
    if (listToExport.length === 0) {
      alert("No matching records to export.");
      return;
    }

    const flatRows = listToExport.map(s => {
      // Find current active stages
      const completedStages = Object.entries(s.workflow)
        .filter(([_, value]) => (value as any).status === "completed")
        .map(([key]) => key);
      
      const inProgressStages = Object.entries(s.workflow)
        .filter(([_, value]) => (value as any).status === "in_progress")
        .map(([key]) => key);

      return {
        "Sewadar ID": s.id,
        "Full Name": s.name,
        "Badge Number": s.badgeNumber || "AWAITING LEVEL",
        "Temporary ID": s.tempNumber,
        "Contact Number": s.contactNumber,
        "Emergency Mobile": s.emergencyContact,
        "Gender": s.gender,
        "Date of Birth": s.dob,
        "Age": getAge(s.dob),
        "Age Group": getAgeGroupLabel(s.dob),
        "Address Location": s.address,
        "Satsang Centre": s.location,
        "Satsang Area": s.area || "N/A",
        "Sewa Department": s.sewaType || "N/A",
        "Profile Status": s.status,
        "Workflow Progress %": s.progress,
        "Total Completed Checkpoints": completedStages.length,
        "Pending Checkpoint In_Progress": inProgressStages.join(", ") || "None",
        "Joining Date": s.createdDate
      };
    });

    const fileName = `Sewadars_Report_${exportFilteredOnly ? "Filtered" : "All"}_2026`;
    const ok = exportToExcel(flatRows, fileName);
    if (ok) {
      onLogEvent("Excel Export History", `Exported ${flatRows.length} sewadar records as .xlsx spreadsheet. File: ${fileName}.`);
      alert(`Polished Excel spreadsheet generated! Download initialized for ${flatRows.length} rows.`);
    } else {
      alert("Failed compiling spreadsheet. Review logs.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Header */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left search */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Sewadar Name, Badge No, Phone, or Location..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all border border-slate-150"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          {/* Filters/Actions row */}
          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold select-none transition-all cursor-pointer ${showFilters ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "bg-slate-50/50 hover:bg-slate-50 border-slate-200 text-slate-600"}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Advanced Filters
            </button>

            {/* Excel Exports */}
            {canExport && (
              <div className="flex items-center bg-slate-50 border border-slate-200 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => handleExport(true)}
                  className="px-2.5 py-2 text-indigo-700 hover:bg-white hover:shadow-xs rounded-lg transition-all flex items-center gap-1 text-[11px] font-bold"
                  title="Export currently filtered list as .xlsx"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-500" /> Filtered (.xlsx)
                </button>
                <button
                  onClick={() => handleExport(false)}
                  className="px-2.5 py-2 text-slate-600 hover:bg-white hover:shadow-xs rounded-lg transition-all flex items-center gap-1 text-[11px] font-bold border-l border-slate-200"
                  title="Export all rows"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" /> Export All (.xlsx)
                </button>
              </div>
            )}

            {/* Layout Toggles */}
            <div className="bg-slate-100/80 p-0.5 rounded-lg flex items-center border border-slate-200">
              <button
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === "table" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                title="Table view"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                title="Grid cards"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Add Enrollment Button */}
            {canAdd && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/10 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Enroll Sewadar
              </button>
            )}
          </div>
        </div>

        {/* Expandable Advanced Filters Segment */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-1 px-1">
            
            {/* 1. Satsang Centre (Location) */}
            <div>
              <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Satsang Centre</label>
              <select
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:bg-white outline-none cursor-pointer"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <option value="All">All Centres</option>
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* 2. Area */}
            <div>
              <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Satsang Area</label>
              <select
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:bg-white outline-none cursor-pointer"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
              >
                <option value="All">All Areas</option>
                {dynamicAreas.map((ar) => (
                  <option key={ar} value={ar}>{ar}</option>
                ))}
              </select>
            </div>

            {/* 3. Sewa Type */}
            <div>
              <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Sewa Assigned Type</label>
              <select
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:bg-white outline-none cursor-pointer"
                value={selectedSewaType}
                onChange={(e) => setSelectedSewaType(e.target.value)}
              >
                <option value="All">All Sewa Roles</option>
                {dynamicSewaTypes.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* 4. Active/Inactive Status */}
            <div>
              <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Profile Status</label>
              <select
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:bg-white outline-none cursor-pointer"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="All">All Profiles</option>
                <option value="Active">Active Tracker</option>
                <option value="Completed">Completed Badge</option>
                <option value="Hold">On Hold</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* 5. Workflow Checkpoint (Stage) */}
            <div>
              <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-indigo-505" /> Checkpoint Stage
              </label>
              <select
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:bg-white outline-none cursor-pointer"
                value={selectedWorkflowStage}
                onChange={(e) => setSelectedWorkflowStage(e.target.value)}
              >
                <option value="All">All Stages Checkpoint</option>
                {CHECKPOINTS_STAGES.map((stg) => (
                  <option key={stg.key} value={stg.key}>{stg.label}</option>
                ))}
              </select>
            </div>

            {/* 6. Checkpoint STAGE STATUS */}
            <div>
              <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Checkpoint Stage Status</label>
              <select
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:bg-white outline-none cursor-pointer"
                disabled={selectedWorkflowStage === "All"}
                value={selectedWorkflowStatus}
                onChange={(e) => setSelectedWorkflowStatus(e.target.value)}
              >
                <option value="All">All States</option>
                <option value="completed">Completed (Passed)</option>
                <option value="in_progress">In Progress</option>
                <option value="failed">Failed / Flagged Warning</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* 7. Attendance Status on Selected Date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Atten Date</label>
                <input
                  type="date"
                  className="w-full text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-lg p-1 text-slate-700 outline-none focus:bg-white"
                  value={selectedAttDate}
                  onChange={(e) => setSelectedAttDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5 font-semibold">Atten Status</label>
                <select
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-1 text-slate-700 outline-none focus:bg-white cursor-pointer"
                  value={selectedAttStatus}
                  onChange={(e) => setSelectedAttStatus(e.target.value)}
                >
                  <option value="All font-bold">All</option>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="HalfDay">HalfDay</option>
                  <option value="Leave">On Leave</option>
                </select>
              </div>
            </div>

            {/* 8. Demographics: Gender */}
            <div>
              <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Gender</label>
              <select
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:bg-white cursor-pointer outline-none"
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value)}
              >
                <option value="All">All Genders</option>
                <option value="Male">Male Only</option>
                <option value="Female">Female Only</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* 9. Age Group */}
            <div>
              <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Demographics Age Group</label>
              <select
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:bg-white cursor-pointer outline-none"
                value={selectedAgeGroup}
                onChange={(e) => setSelectedAgeGroup(e.target.value)}
              >
                <option value="All">All Ages</option>
                <option value="Youth (<30)">Youth (&lt;30)</option>
                <option value="Middle-Aged (30-50)">Middle-Aged (30-50)</option>
                <option value="Senior (>50)">Senior (&gt;50)</option>
              </select>
            </div>

            {/* 10. Joining range: START */}
            <div>
              <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-405" /> Start Join Date
              </label>
              <input
                type="date"
                className="w-full text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:bg-white outline-none"
                value={createdStart}
                onChange={(e) => setCreatedStart(e.target.value)}
              />
            </div>

            {/* 11. Joining range: END */}
            <div>
              <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-405" /> End Join Date
              </label>
              <input
                type="date"
                className="w-full text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 focus:bg-white outline-none"
                value={createdEnd}
                onChange={(e) => setCreatedEnd(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main List Rendering */}
      {filteredSewadars.length === 0 ? (
        <div className="bg-slate-50/50 p-12 text-center rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-400 text-sm font-bold mb-1">No matching Sewadars found</p>
          <p className="text-slate-400 text-xs font-medium">Clear some advanced filters or adjust your text query to find records.</p>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID LAYOUT VIEWS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredSewadars.map((s) => {
            const agingInfo = getAgingInfo(s.createdDate, s.status);
            
            // Get last completed stage name
            const stages = Object.entries(s.workflow);
            const compList = stages.filter(([_, v]) => (v as any).status === "completed");
            const activeStageKey = compList.length > 0 ? compList[compList.length - 1][0] : "None";
            const activeStageLabel = CHECKPOINTS_STAGES.find(c => c.key === activeStageKey)?.label ?? "Not Started";

            return (
              <div
                key={s.id}
                onClick={() => onSelectSewadar(s.id)}
                className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-xs hover:shadow-md hover:border-slate-200 transition-all cursor-pointer relative flex flex-col justify-between group"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-[9px] font-mono font-bold uppercase py-0.5 px-2 rounded-full border ${s.enrollmentType === "New" ? "bg-indigo-50 text-indigo-600 border-indigo-100" : s.enrollmentType === "Transfer" ? "bg-cyan-50 text-cyan-600 border-cyan-100" : "bg-purple-50 text-purple-600 border-purple-100"}`}>
                      {s.enrollmentType}
                    </span>

                    <span className={`flex items-center gap-1 text-[10px] font-bold ${s.status === "Completed" ? "text-emerald-600" : s.status === "Hold" ? "text-amber-500" : s.status === "Rejected" ? "text-rose-500" : "text-indigo-600"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.status === "Completed" ? "bg-emerald-500" : s.status === "Hold" ? "bg-amber-450" : s.status === "Rejected" ? "bg-rose-500" : "bg-indigo-500 animate-pulse"}`}></span>
                      {s.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-11 h-11 rounded-full bg-slate-100 ring-4 ring-slate-50 overflow-hidden flex-shrink-0">
                      {s.photographUrl ? (
                        <img src={s.photographUrl} alt={s.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full text-slate-400 bg-slate-50 flex items-center justify-center font-bold text-xs uppercase">
                          {s.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors uppercase pr-1">{s.name}</h4>
                      <p className="text-[10px] font-mono text-slate-450 mt-0.5 flex items-center gap-1 font-bold">
                        <FileBadge className="w-3.5 h-3.5 text-indigo-500" />
                        {s.badgeNumber || s.tempNumber}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 mb-4 font-semibold leading-relaxed">
                    <p className="flex items-center gap-1.5 text-[11px] truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                      <span>{s.location.split(",")[0]}</span>
                    </p>
                    {s.sewaType && (
                      <p className="flex items-center gap-1.5 text-[11px]">
                        <Award className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                        <span className="bg-slate-100 text-slate-600 py-0.5 px-2 rounded-md font-bold text-[10px]">{s.sewaType}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-slate-50 pt-3.5 mt-2">
                  <div className="flex justify-between items-center mb-1 text-[11px] font-bold text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-400" /> checkpoint
                    </span>
                    <span className="font-mono text-xs">{s.progress}%</span>
                  </div>
                  
                  {/* Underlay checkpoints details */}
                  <div className="text-[10px] text-slate-450 font-bold mb-2 font-sans truncate bg-slate-50 border p-1 rounded-md border-slate-100">
                    Last: <span className="text-slate-800 font-black">{activeStageLabel}</span>
                  </div>

                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full ${s.progress < 40 ? "bg-amber-400" : s.progress < 90 ? "bg-indigo-500" : "bg-emerald-500"}`}
                      style={{ width: `${s.progress}%` }}
                    ></div>
                  </div>

                  <div className={`flex justify-between items-center border rounded-lg px-2 py-1 text-[10px] font-bold ${agingInfo.color}`}>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Aging SLA
                    </span>
                    <span className="font-mono font-bold">{s.status === "Completed" ? "Completed" : `${agingInfo.days}d (${agingInfo.category})`}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW ROWS (Enterprise format) */
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-50/50">
                <th className="py-3.5 px-4">Profile Details</th>
                <th className="py-3.5 px-4">Identification No</th>
                <th className="py-3.5 px-4">Centre & Area Details</th>
                <th className="py-3.5 px-4">Sewa Assigned</th>
                <th className="py-3.5 px-4 text-center">Active Checkpoints Status</th>
                <th className="py-3.5 px-4">Stage Aging Status</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Audit Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-600 font-semibold text-[11px]">
              {filteredSewadars.map((s) => {
                const agingInfo = getAgingInfo(s.createdDate, s.status);
                
                // Get last completed checkpoint
                const stages = Object.entries(s.workflow);
                const compStages = stages.filter(([_, value]) => (value as any).status === "completed");
                const currentCheckpointKey = compStages.length > 0 ? compStages[compStages.length - 1][0] : "None";
                const checkpointLabel = CHECKPOINTS_STAGES.find(c => c.key === currentCheckpointKey)?.label ?? "Not Started";

                return (
                  <tr
                    key={s.id}
                    onClick={() => onSelectSewadar(s.id)}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                  >
                    {/* Profile Details */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-50 overflow-hidden ring-1 ring-slate-100 flex-shrink-0">
                          {s.photographUrl ? (
                            <img src={s.photographUrl} alt={s.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-500 font-bold text-xs">
                              {s.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-xs border-b border-transparent group-hover:border-indigo-600 group-hover:text-indigo-600 transition-all uppercase">{s.name}</p>
                          <p className="text-[10px] text-slate-450 font-mono mt-0.5 font-bold flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-300" />{s.contactNumber}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Identification */}
                    <td className="py-3.5 px-4 font-mono">
                      <p className="text-slate-800 font-black">{s.badgeNumber || "AWAITING BADGE"}</p>
                      <p className="text-[9px] text-slate-400 font-bold">{s.tempNumber}</p>
                    </td>

                    {/* Centre & Area location */}
                    <td className="py-3.5 px-4">
                      <p className="text-slate-900 font-bold leading-none">{s.location.split(",")[0]}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">Area: {s.area || "General Area"}</p>
                    </td>

                    {/* Enrollment Type */}
                    <td className="py-3.5 px-4 font-bold">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-black text-[10px] uppercase">
                        {s.sewaType || "Volunteer"}
                      </span>
                    </td>

                    {/* Checkpoints & Progress column */}
                    <td className="py-3.5 px-4">
                      <div className="max-w-xs mx-auto flex flex-col justify-center">
                        <div className="flex justify-between w-full text-[9px] font-bold font-mono text-slate-400 mb-0.5">
                          <span className="text-slate-500 select-none uppercase truncate mr-1.5">Checkpoint: <b className="text-indigo-600">{checkpointLabel}</b></span>
                          <span className="font-extrabold text-slate-700 font-mono">{s.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${s.progress < 45 ? "bg-amber-400" : s.progress < 90 ? "bg-indigo-600" : "bg-emerald-500"}`}
                            style={{ width: `${s.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Stage Aging Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-mono font-black border rounded-full ${agingInfo.color}`}>
                        <Clock className="w-3 h-3" />
                        {s.status === "Completed" ? "Completed" : `${agingInfo.days}d (${agingInfo.category})`}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${s.status === "Completed" ? "text-emerald-600" : s.status === "Hold" ? "text-amber-500" : s.status === "Rejected" ? "text-rose-500" : "text-indigo-600"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.status === "Completed" ? "bg-emerald-500" : s.status === "Hold" ? "bg-amber-450" : s.status === "Rejected" ? "bg-rose-500" : "bg-indigo-505"}`}></span>
                        {s.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button 
                        type="button"
                        className="text-white font-bold bg-indigo-600 hover:bg-slate-900 px-3 py-1.5 rounded-xl transition-all font-mono text-[10px] uppercase"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-over Drawer Form: Add / Enroll Sewadar */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex justify-end transition-all">
          <div className="w-full max-w-lg bg-white h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250">
            {/* Header */}
            <div>
              <div className="flex justify-between items-center border-b border-slate-50 pb-4 mb-6">
                <div>
                  <h3 className="text-base font-black text-slate-900 inline-flex items-center gap-1.5">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-500 animate-pulse" />
                    New Sewadar enrolment
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">Register profile and launch tracking in the standard 11-stage workflow</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="p-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Form elements */}
              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-600">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-slate-205 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                      placeholder="e.g. Jaswinder Singh"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Enrolment Process *</label>
                    <select
                      className="w-full p-2 border border-slate-205 bg-white rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer text-xs"
                      value={newEnrollType}
                      onChange={(e) => setNewEnrollType(e.target.value as EnrollmentType)}
                    >
                      <option value="New">Register New candidate</option>
                      <option value="Revival">Revival Profile</option>
                      <option value="Transfer">Transfer from outer centre</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Mobile Contact *</label>
                    <input
                      type="tel"
                      className="w-full p-2 border border-slate-205 rounded-lg focus:outline-none"
                      placeholder="+91 98765 43210"
                      required
                      value={newContact}
                      onChange={(e) => setNewContact(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Emergency Mobile Contact</label>
                    <input
                      type="tel"
                      className="w-full p-2 border border-slate-205 rounded-lg focus:outline-none"
                      placeholder="+91 91223 44556"
                      value={newEmergency}
                      onChange={(e) => setNewEmergency(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Date of Birth</label>
                    <input
                      type="date"
                      className="w-full p-2 border border-slate-205 bg-white rounded-lg focus:outline-none text-[11px]"
                      value={newDob}
                      onChange={(e) => setNewDob(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Gender *</label>
                    <div className="flex items-center space-x-3 pt-1.5 font-medium">
                      {["Male", "Female", "Other"].map((gen) => (
                        <label key={gen} className="inline-flex items-center space-x-1 cursor-pointer">
                          <input
                            type="radio"
                            name="gender"
                            checked={newGender === gen}
                            onChange={() => setNewGender(gen as any)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>{gen}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Assigned Sewa Centre *</label>
                    <select
                      className="w-full p-2 border border-slate-205 bg-white rounded-lg cursor-pointer max-w-full text-xs"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                    >
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>{loc.split(",")[0]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Branch Satsang Area</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-slate-205 rounded-lg focus:outline-none"
                      placeholder="e.g. Area-34B"
                      value={newArea}
                      onChange={(e) => setNewArea(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Sewa Department Duty Classification</label>
                  <select
                    className="w-full p-2 border border-slate-205 bg-white rounded-lg cursor-pointer text-xs"
                    value={newSewaType}
                    onChange={(e) => setNewSewaType(e.target.value)}
                  >
                    <option value="Kitchen (Langar)">Kitchen (Langar)</option>
                    <option value="Security">Security Guard</option>
                    <option value="Administrative">Administrative Clerical</option>
                    <option value="Cleaning">Cleaning Sewa</option>
                    <option value="Prashad Distribution">Prashad Distribution</option>
                    <option value="Medical">Medical / Health Team</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Residential Address Details</label>
                  <textarea
                    rows={2}
                    className="w-full p-2 border border-slate-205 rounded-lg focus:outline-none text-xs"
                    placeholder="Provide full residential credentials..."
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                  ></textarea>
                </div>

                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Photograph Asset URL (Unsplash)</label>
                  <input
                    type="url"
                    className="w-full p-2 border border-slate-205 rounded-lg focus:outline-none"
                    placeholder="https://images.unsplash.com/photo-1544..."
                    value={newPhoto}
                    onChange={(e) => setNewPhoto(e.target.value)}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Leave blank for dynamic initial vector generation.</span>
                </div>
              </form>
            </div>

            {/* Submit Actions */}
            <div className="border-t border-slate-100 pt-4 mt-6 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-600 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-xs shadow-md"
              >
                Begin Enrolment Tracking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
