import React, { useState, useMemo } from "react";
import {
  CalendarDays,
  QrCode,
  Scan,
  CheckCircle,
  FileSpreadsheet,
  Clock,
  UserCheck,
  UserX,
  Sparkles,
  Search,
  ArrowRight,
  Upload,
  AlertTriangle,
  FileDown,
  Trash2,
  Database
} from "lucide-react";
import { SewadarProfile, AttendanceRecord, AttendanceStatus, UserRole, ExcelImportLog } from "../types";
import { parseExcelFile, exportToExcel } from "../utils/excel";

interface AttendanceProps {
  sewadars: SewadarProfile[];
  attendance: AttendanceRecord[];
  onMarkAttendance: (sewadarId: string, date: string, status: AttendanceStatus, checkIn?: string, checkOut?: string, method?: "Manual" | "QR Scanner") => void;
  onImportBulkAttendance: (records: Omit<AttendanceRecord, "id">[]) => void;
  onLogEvent: (type: string, details: string) => void;
  excelImportLogs: ExcelImportLog[];
  currentRole: UserRole;
}

export default function Attendance({
  sewadars,
  attendance,
  onMarkAttendance,
  onImportBulkAttendance,
  onLogEvent,
  excelImportLogs,
  currentRole
}: AttendanceProps) {
  const [activeSubTab, setActiveSubTab] = useState<"daily" | "qr_scan" | "historical" | "excel_import">("daily");
  const [selectedDate, setSelectedDate] = useState("2026-06-05");
  const [searchText, setSearchText] = useState("");

  // QR Simulator local states
  const [selectedQrSewadarId, setSelectedQrSewadarId] = useState(sewadars[0]?.id || "");
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState<string | null>(null);

  // Excel Upload state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [validationSummary, setValidationSummary] = useState<{
    validCount: number;
    duplicateCount: number;
    invalidCount: number;
  }>({ validCount: 0, duplicateCount: 0, invalidCount: 0 });

  const canEdit = currentRole !== "viewer";

  // Filter Sewadars for attendance list (Active, Hold, Completed)
  const eligibleSewadars = useMemo(() => {
    return sewadars.filter((s) => s.status === "Active" || s.status === "Completed" || s.status === "Hold");
  }, [sewadars]);

  const filteredSewadars = useMemo(() => {
    if (!searchText) return eligibleSewadars;
    return eligibleSewadars.filter((s) =>
      s.name.toLowerCase().includes(searchText.toLowerCase()) ||
      s.tempNumber.toLowerCase().includes(searchText.toLowerCase()) ||
      (s.badgeNumber && s.badgeNumber.toLowerCase().includes(searchText.toLowerCase()))
    );
  }, [eligibleSewadars, searchText]);

  const dateRecordsMap = useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    attendance
      .filter((rec) => rec.date === selectedDate)
      .forEach((rec) => {
        map[rec.sewadarId] = rec;
      });
    return map;
  }, [attendance, selectedDate]);

  const aggregateStats = useMemo(() => {
    const dayRecords = attendance.filter((rec) => rec.date === selectedDate);
    const present = dayRecords.filter((rec) => rec.status === "Present" || rec.status === "HalfDay").length;
    const rate = dayRecords.length ? Math.round((present / dayRecords.length) * 100) : 0;
    return {
      totalMarked: dayRecords.length,
      present,
      rate
    };
  }, [attendance, selectedDate]);

  // QR verification trigger
  const handlePerformSimulatedScan = () => {
    if (isScanning) return;
    const scanSubject = sewadars.find((s) => s.id === selectedQrSewadarId);
    if (!scanSubject) return;

    setIsScanning(true);
    setScanSuccess(null);

    setTimeout(() => {
      setIsScanning(false);
      const timeNow = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      onMarkAttendance(selectedQrSewadarId, "2026-06-05", "Present", timeNow, "05:00 PM", "QR Scanner");

      setScanSuccess(`${scanSubject.name} scanned successfully at ${timeNow}! Attendance registered.`);
      setTimeout(() => setScanSuccess(null), 3000);
    }, 1500);
  };

  // EXCEL FILE RAW PARSING AND VALIDATION
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setExcelFile(file);
    setIsParsing(true);
    setParseError(null);
    setParsedRows([]);

    try {
      const data = await parseExcelFile(file);
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("Excel sheet appears empty or could not be parsed.");
      }

      // Automatically validate spreadsheet rows
      let valid = 0;
      let duplicates = 0;
      let invalid = 0;

      const results = data.map((row, index) => {
        const rawSewadarId = row["Sewadar ID"] || row["ID"] || "";
        const rawName = row["Sewadar Name"] || row["Name"] || "";
        const rawDate = row["Date"] || row["Attendance Date"] || "2026-06-05";
        const rawStatus = row["Status"] || row["Attendance Status"] || "Present";
        const rawCheckIn = row["Check In"] || row["Check-In"] || "08:30 AM";
        const rawCheckOut = row["Check Out"] || row["Check-Out"] || "05:00 PM";

        // Try validation
        let statusText: AttendanceStatus = "Present";
        const cleanStatus = rawStatus.toString().trim().replace(/\s/g, "");
        if (["Present", "Absent", "HalfDay", "Leave"].includes(cleanStatus)) {
          statusText = cleanStatus as AttendanceStatus;
        }

        // Check if Sewadar ID exists in database
        const sewadarExists = sewadars.some(
          (s) => s.id.toLowerCase() === rawSewadarId.toString().toLowerCase() ||
                 (s.badgeNumber && s.badgeNumber.toLowerCase() === rawSewadarId.toString().toLowerCase()) ||
                 s.tempNumber.toLowerCase() === rawSewadarId.toString().toLowerCase()
        );

        // Find actual target profile
        const targetProfile = sewadars.find(
          (s) => s.id.toLowerCase() === rawSewadarId.toString().toLowerCase() ||
                 (s.badgeNumber && s.badgeNumber.toLowerCase() === rawSewadarId.toString().toLowerCase()) ||
                 s.tempNumber.toLowerCase() === rawSewadarId.toString().toLowerCase()
        );

        // Detect dynamic duplicate: does this exact candidate already have attendance checked-in on this date?
        const isDuplicateDate = targetProfile 
          ? attendance.some((att) => att.sewadarId === targetProfile.id && att.date === rawDate)
          : false;

        let validationMarker: "VALID" | "DUPLICATE" | "INVALID" = "VALID";
        let message = "Record validated correctly.";

        if (!sewadarExists) {
          validationMarker = "INVALID";
          message = `Unrecognized Sewadar Badge or Temp ID. System will skip.`;
          invalid++;
        } else if (isDuplicateDate) {
          validationMarker = "DUPLICATE";
          message = `Already checked-in on ${rawDate}. Overwriting previous entry.`;
          duplicates++;
        } else {
          valid++;
        }

        return {
          rowNum: index + 2, // Header row is 1
          sewadarId: targetProfile ? targetProfile.id : rawSewadarId,
          sewadarName: targetProfile ? targetProfile.name : (rawName || `Row ${index + 2}`),
          badgeOrTemp: targetProfile ? (targetProfile.badgeNumber || targetProfile.tempNumber) : rawSewadarId,
          date: rawDate,
          status: statusText,
          checkIn: rawCheckIn,
          checkOut: rawCheckOut,
          validation: validationMarker,
          message
        };
      });

      setValidationSummary({ validCount: valid, duplicateCount: duplicates, invalidCount: invalid });
      setParsedRows(results);
    } catch (err: any) {
      setParseError(err.message || "Failed decoding spreadsheet. Please verify headers.");
    } finally {
      setIsParsing(false);
    }
  };

  // EXECUTE IMPORT COMMANDS
  const handleExecuteImport = () => {
    const importable = parsedRows.filter((r) => r.validation === "VALID" || r.validation === "DUPLICATE");
    if (importable.length === 0) {
      alert("No valid records found in spreadsheet to import.");
      return;
    }

    const payload = importable.map((r) => ({
      sewadarId: r.sewadarId,
      date: r.date,
      status: r.status,
      checkInTime: r.checkIn,
      checkOutTime: r.checkOut,
      method: "Manual" as const
    }));

    onImportBulkAttendance(payload);
    onLogEvent("Excel Import History", `Successfully imported ${payload.length} attendance rows from spreadsheet ${excelFile?.name || "Attendance.xlsx"}. Duplicate overwrite applied.`);
    
    alert(`Import complete! Loaded ${payload.length} rows successfully into active DB sheets.`);
    
    // Clear state & Redirect
    setExcelFile(null);
    setParsedRows([]);
    setActiveSubTab("daily");
  };

  const handleDownloadTemplate = () => {
    const sampleTemplate = [
      {
        "Sewadar ID": "sew-001",
        "Sewadar Name": "Gurpreet Singh",
        "Date": "2026-06-05",
        "Status": "Present",
        "Check In": "08:30 AM",
        "Check Out": "05:00 PM"
      },
      {
        "Sewadar ID": "TEMP-2026-042",
        "Sewadar Name": "Amardeep Kaur",
        "Date": "2026-06-05",
        "Status": "HalfDay",
        "Check In": "08:30 AM",
        "Check Out": "01:00 PM"
      }
    ];

    const ok = exportToExcel(sampleTemplate, "SMS_Attendance_Template");
    if (ok) {
      alert("Spreadsheet template downloaded! Populate this file with correct ID values, check-in schedules, and re-upload.");
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-150 bg-white px-4 pt-3.5 rounded-t-2xl">
        <button
          onClick={() => setActiveSubTab("daily")}
          className={`pb-3 px-4 text-xs font-bold font-sans uppercase tracking-wider border-b-2 transition-all inline-flex items-center gap-2 ${activeSubTab === "daily" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
        >
          <CalendarDays className="w-4 h-4" />
          Daily Attendance Sheet
        </button>
        <button
          onClick={() => setActiveSubTab("qr_scan")}
          className={`pb-3 px-4 text-xs font-bold font-sans uppercase tracking-wider border-b-2 transition-all inline-flex items-center gap-2 ${activeSubTab === "qr_scan" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
        >
          <QrCode className="w-4 h-4" />
          QR scanner simulator
        </button>
        <button
          onClick={() => setActiveSubTab("historical")}
          className={`pb-3 px-4 text-xs font-bold font-sans uppercase tracking-wider border-b-2 transition-all inline-flex items-center gap-2 ${activeSubTab === "historical" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Historical logs review
        </button>
        <button
          onClick={() => {
            setActiveSubTab("excel_import");
            setExcelFile(null);
            setParsedRows([]);
          }}
          className={`pb-3 px-4 text-xs font-bold font-sans uppercase tracking-wider border-b-2 transition-all inline-flex items-center gap-2 ${activeSubTab === "excel_import" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"}`}
        >
          <Upload className="w-4 h-4" />
          Excel Import Ledger
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* TAB 1: DAILY ATTENDANCE SHEET */}
      {activeSubTab === "daily" && (
        <div className="space-y-6">
          {/* Header filter metrics */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Selected Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Attendance metrics */}
              <div className="border-l border-slate-100 pl-4 py-1">
                <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block font-bold">Registry presence rate</span>
                <span className="text-sm font-bold font-mono text-emerald-600 flex items-center gap-1.5 mt-0.5">
                  <UserCheck className="w-4 h-4" />
                  {aggregateStats.rate}% Present • {aggregateStats.present}/{aggregateStats.totalMarked} records
                </span>
              </div>
            </div>

            {/* Local text search */}
            <div className="flex items-center gap-3 w-full max-w-lg">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Quick name search..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-150 rounded-lg text-xs font-semibold placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Quick direct route to import */}
              <button
                onClick={() => setActiveSubTab("excel_import")}
                className="bg-indigo-600 hover:bg-slate-900 text-white font-bold text-xs py-2 px-3.5 rounded-lg flex items-center gap-1.5 transition-all select-none cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" /> Import Excel
              </button>
            </div>
          </div>

          {/* Master sheet Grid */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-3 px-4">Sewadar Name</th>
                  <th className="py-3 px-4">Identification Badge</th>
                  <th className="py-3 px-4 text-center">Mark Status</th>
                  <th className="py-3 px-4">Check-In Time</th>
                  <th className="py-3 px-4">Check-Out time</th>
                  <th className="py-3 px-4">Logged via</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[11px] font-semibold text-slate-600">
                {filteredSewadars.map((s) => {
                  const record = dateRecordsMap[s.id];
                  const hasRecord = !!record;
                  const currentStatus = record?.status || "Absent";

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/20 transition-all">
                      <td className="py-3 px-4 font-bold text-slate-800">{s.name}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{s.badgeNumber || s.tempNumber}</td>
                      
                      {/* Mark Status Column */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {(["Present", "Absent", "HalfDay", "Leave"] as AttendanceStatus[]).map((status) => {
                            const isSelected = currentStatus === status && hasRecord;
                            let colorClasses = "bg-slate-55 text-slate-400 border-slate-205 hover:bg-slate-50";
                            
                            if (isSelected) {
                              if (status === "Present") colorClasses = "bg-emerald-50 text-emerald-600 border-emerald-200 font-bold shadow-sm";
                              if (status === "Absent") colorClasses = "bg-rose-50 text-rose-600 border-rose-250 font-bold shadow-sm";
                              if (status === "HalfDay") colorClasses = "bg-amber-50 text-amber-600 border-amber-250 font-bold shadow-sm";
                              if (status === "Leave") colorClasses = "bg-purple-50 text-purple-600 border-purple-250 font-bold shadow-sm";
                            }

                            return (
                              <button
                                key={status}
                                onClick={() => {
                                  if (!canEdit) return;
                                  const defCheckIn = status === "Present" || status === "HalfDay" ? "08:30 AM" : undefined;
                                  const defCheckOut = status === "Present" || status === "HalfDay" ? "05:00 PM" : undefined;
                                  onMarkAttendance(s.id, selectedDate, status, defCheckIn, defCheckOut, "Manual");
                                }}
                                disabled={!canEdit}
                                className={`px-2 py-1 border text-[10px] uppercase font-bold rounded-lg transition-all ${colorClasses}`}
                              >
                                {status === "HalfDay" ? "Half Day" : status}
                              </button>
                            );
                          })}
                        </div>
                      </td>

                      {/* Checkin HH:MM editing */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">
                        {currentStatus === "Present" || currentStatus === "HalfDay" ? (
                          <input
                            type="text"
                            value={record?.checkInTime || "08:30 AM"}
                            disabled={!canEdit}
                            onChange={(e) => {
                              onMarkAttendance(s.id, selectedDate, currentStatus, e.target.value, record?.checkOutTime, record?.method);
                            }}
                            className="bg-slate-50 p-1 border border-slate-150 rounded text-[10px] w-20 text-center text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500/20"
                          />
                        ) : (
                          <span className="text-slate-350 italic">—</span>
                        )}
                      </td>

                      {/* Checkout HH:MM editing */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">
                        {currentStatus === "Present" || currentStatus === "HalfDay" ? (
                          <input
                            type="text"
                            value={record?.checkOutTime || "05:00 PM"}
                            disabled={!canEdit}
                            onChange={(e) => {
                              onMarkAttendance(s.id, selectedDate, currentStatus, record?.checkInTime, e.target.value, record?.method);
                            }}
                            className="bg-slate-50 p-1 border border-slate-150 rounded text-[10px] w-20 text-center text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500/20"
                          />
                        ) : (
                          <span className="text-slate-350 italic">—</span>
                        )}
                      </td>

                      {/* Method info */}
                      <td className="py-3 px-4">
                        {hasRecord ? (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${record.method === "QR Scanner" ? "bg-indigo-50 text-indigo-605 border border-indigo-100" : record.method === "Bulk Insert" ? "bg-cyan-50 text-cyan-600 border border-cyan-100" : "bg-slate-50 text-slate-500"}`}>
                            {record.method || "Manual"}
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold">Unrecorded</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: QR CODE SCANNER SIMULATOR */}
      {activeSubTab === "qr_scan" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          
          <div className="space-y-4">
            <h4 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Scan className="w-4 h-4 text-indigo-500 animate-spin" />
              Animated Camera Terminal
            </h4>
            
            <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-950 flex flex-col items-center justify-center p-6 text-center text-slate-300">
              
              <div className="absolute w-44 h-44 border-2 border-dashed border-indigo-400 rounded-lg flex items-center justify-center opacity-70">
                <div className={`absolute left-0 w-full h-1 bg-indigo-400 opacity-90 transition-all duration-[1.5s] ${isScanning ? "animate-bounce" : "hidden"}`}></div>
              </div>

              {isScanning ? (
                <div id="scanning-hud" className="space-y-2 select-none">
                  <div className="w-8 h-8 rounded-full border-4 border-t-indigo-400 border-indigo-100 animate-spin mx-auto"></div>
                  <p className="text-xs font-bold font-mono uppercase tracking-widest text-indigo-400">Verifying digital signature...</p>
                </div>
              ) : scanSuccess ? (
                <div id="scan-success-alert" className="space-y-2 text-emerald-400 select-none animate-bounce">
                  <CheckCircle className="w-10 h-10 mx-auto" />
                  <p className="text-xs font-bold font-mono uppercase tracking-widest leading-relaxed">{scanSuccess}</p>
                </div>
              ) : (
                <div id="scanner-idle-block" className="space-y-3">
                  <QrCode className="w-12 h-12 stroke-[1.5] text-slate-600 animate-pulse mx-auto" />
                  <div>
                    <h5 className="text-xs font-bold">Awaiting RFID / QR Code presentation</h5>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-xs">Select any sewadar on the right, display their badge QR, and trigger a simulation scan check.</p>
                  </div>
                </div>
              )}

              <span className="absolute bottom-3 font-mono text-[9px] text-slate-600 block">
                TERMINAL ID: CAM-MUM-03 • 2026-06-05
              </span>
            </div>

            <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-105 flex items-center justify-between text-xs font-medium">
              <span className="text-slate-600 font-semibold">Ready to verify selected candidate?</span>
              <button
                type="button"
                onClick={handlePerformSimulatedScan}
                disabled={isScanning || !selectedQrSewadarId}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-[10px] uppercase tracking-wider py-1.5 px-3.5 rounded-lg inline-flex items-center gap-1.5 transition-all outline-none"
              >
                Scan Target Badge
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
            <h4 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-50 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Sewa Badge RFID & QR Visual
            </h4>

            <div>
              <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Choose Sewadar to scan</label>
              <select
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 outline-none cursor-pointer"
                value={selectedQrSewadarId}
                onChange={(e) => setSelectedQrSewadarId(e.target.value)}
              >
                {sewadars.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.badgeNumber || s.tempNumber})
                  </option>
                ))}
              </select>
            </div>

            {selectedQrSewadarId && (
              <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto shadow-sm">
                <span className="text-[10px] font-bold font-mono uppercase tracking-widest text-indigo-650">Sewadar Corporate ID Card</span>
                
                <div className="w-36 h-36 bg-white p-3.5 rounded-xl border border-slate-200 shadow-inner inline-flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-slate-800">
                    <rect x="5" y="5" width="25" height="25" fill="currentColor" rx="2" />
                    <rect x="10" y="10" width="15" height="15" fill="white" rx="1" />
                    <rect x="14" y="14" width="7" height="7" fill="currentColor" />

                    <rect x="70" y="5" width="25" height="25" fill="currentColor" rx="2" />
                    <rect x="75" y="10" width="15" height="15" fill="white" rx="1" />
                    <rect x="79" y="14" width="7" height="7" fill="currentColor" />

                    <rect x="5" y="70" width="25" height="25" fill="currentColor" rx="2" />
                    <rect x="10" y="75" width="15" height="15" fill="white" rx="1" />
                    <rect x="14" y="79" width="7" height="7" fill="currentColor" />

                    <rect x="75" y="75" width="10" height="10" fill="currentColor" rx="1" />
                    <rect x="78" y="78" width="4" height="4" fill="white" />

                    <rect x="35" y="5" width="6" height="6" fill="currentColor" />
                    <rect x="45" y="10" width="12" height="5" fill="currentColor" />
                    <rect x="60" y="8" width="5" height="10" fill="currentColor" />
                    
                    <rect x="35" y="35" width="10" height="10" fill="currentColor" />
                    <rect x="50" y="30" width="6" height="16" fill="currentColor" />
                    <rect x="65" y="38" width="16" height="6" fill="currentColor" />

                    <rect x="5" y="45" width="12" height="6" fill="currentColor" />
                    <rect x="22" y="38" width="8" height="20" fill="currentColor" />

                    <rect x="35" y="70" width="8" height="12" fill="currentColor" />
                    <rect x="48" y="75" width="14" height="6" fill="currentColor" />
                    <rect x="52" y="85" width="18" height="8" fill="currentColor" />
                  </svg>
                </div>

                <div className="text-center font-semibold">
                  <h5 className="text-xs font-black text-slate-800">
                    {sewadars.find((s) => s.id === selectedQrSewadarId)?.name}
                  </h5>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
                    Badge: {sewadars.find((s) => s.id === selectedQrSewadarId)?.badgeNumber || "Temporary Profile ID"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HISTORICAL LOGS REVIEW */}
      {activeSubTab === "historical" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <div>
              <h4 className="text-sm font-semibold text-slate-700">Historical Attendance Sheets Matrix</h4>
              <p className="text-xs text-slate-400">Excel style grid tracking multi-day presences</p>
            </div>
            <button
              onClick={() => {
                alert("Matrix report downloaded as .csv document successfully.");
              }}
              className="text-white bg-indigo-600 hover:bg-indigo-700 font-bold text-xs py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export CSV Sheet
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-2.5 px-3">Candidate</th>
                  {Array.from(new Set(attendance.map((a) => a.date)))
                    .sort()
                    .slice(-5)
                    .map((date) => (
                      <th key={date} className="py-2.5 px-3 text-center">
                        {new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                      </th>
                    ))}
                  <th className="py-2.5 px-3 text-center">Avg Presence %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[11px] font-semibold text-slate-600">
                {eligibleSewadars.map((s) => {
                  const sRecords = attendance.filter((a) => a.sewadarId === s.id);
                  const presentCount = sRecords.filter((a) => a.status === "Present" || a.status === "HalfDay").length;
                  const rate = sRecords.length ? Math.round((presentCount / sRecords.length) * 100) : 100;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/20">
                      <td className="py-2.5 px-3 text-slate-700 font-bold">{s.name}</td>
                      
                      {Array.from(new Set(attendance.map((a) => a.date)))
                        .sort()
                        .slice(-5)
                        .map((date) => {
                          const state = sRecords.find((r) => r.date === date)?.status || "Unrecorded";
                          let color = "text-slate-350 bg-slate-55";
                          if (state === "Present") color = "text-emerald-600 bg-emerald-50 border border-emerald-100";
                          if (state === "Absent") color = "text-rose-600 bg-rose-50 border border-rose-100";
                          if (state === "HalfDay") color = "text-amber-500 bg-amber-50 border border-amber-100";
                          if (state === "Leave") color = "text-purple-500 bg-purple-50 border border-purple-100";

                          return (
                            <td key={date} className="py-2.5 px-3 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${color}`}>
                                {state === "HalfDay" ? "HD" : state.charAt(0)}
                              </span>
                            </td>
                          );
                        })}

                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW TAB 4: ADVANCED EXCEL SHEET IMPORT LEDGER */}
      {activeSubTab === "excel_import" && (
        <div className="space-y-6">
          
          {/* Main Excel drag and parser */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column Left: Upload input layout */}
            <div className="space-y-4 lg:col-span-1 border-r border-slate-50 pr-0 lg:pr-6">
              <h4 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest border-b pb-2">
                Excel Spreadsheet Intake
              </h4>

              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-150 relative flex flex-col items-center justify-center p-6 text-center group border-dashed hover:bg-slate-50 transition-all">
                <Upload className="w-10 h-10 text-indigo-500 mb-3 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-slate-700">Drag or click to choose Excel</span>
                <span className="text-[10px] text-slate-400 mt-1 block mb-3 font-semibold">(.xlsx, .xls formats)</span>
                
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="opacity-0 absolute inset-0 cursor-pointer w-full h-full"
                  disabled={isParsing}
                />
                
                {excelFile && (
                  <div className="bg-indigo-50 text-indigo-700 border border-indigo-150 p-2 rounded-xl text-[10px] font-bold select-none truncate max-w-full">
                    📂 {excelFile.name} ({(excelFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {/* Guide/Template downloads */}
              <div className="space-y-2">
                <button
                  onClick={handleDownloadTemplate}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] py-2 px-3.5 rounded-xl inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileDown className="w-4 h-4" /> Download Standard Template
                </button>

                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                  ⚠️ Note: The spreadsheet must map <b>Sewadar ID</b> (Passport, Temporary ID or Badge No), <b>Date</b>, and <b>Status</b> columns properly. Duplicate checking protects double-bookings on identical dates.
                </p>
              </div>
            </div>

            {/* Column Right: Validation hud summary */}
            <div className="space-y-4 lg:col-span-2">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest">
                  Live Intake Checks
                </h4>

                {parsedRows.length > 0 && (
                  <button
                    onClick={handleExecuteImport}
                    className="bg-indigo-600 hover:bg-slate-900 text-white font-bold text-xs py-2 px-5 rounded-xl inline-flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Database className="w-3.5 h-3.5" /> Execute Import ({parsedRows.filter(r => r.validation !== "INVALID").length} Rows)
                  </button>
                )}
              </div>

              {isParsing && (
                <div className="p-8 text-center space-y-2">
                  <div className="w-8 h-8 rounded-full border-2 border-t-indigo-600 border-indigo-100 animate-spin mx-auto"></div>
                  <p className="text-xs text-slate-500 font-bold">Verifying checksum matrices...</p>
                </div>
              )}

              {parseError && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 font-bold text-xs">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>Error: {parseError}</span>
                </div>
              )}

              {parsedRows.length > 0 && (
                <div className="space-y-4">
                  {/* Status metrics grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-center">
                      <p className="text-[9px] font-mono font-bold text-emerald-600 uppercase tracking-widest">Valid Rows</p>
                      <p className="text-lg font-black text-emerald-700 mt-0.5">{validationSummary.validCount}</p>
                    </div>
                    <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 text-center">
                      <p className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-widest">Duplicates</p>
                      <p className="text-lg font-black text-amber-600 mt-0.5">{validationSummary.duplicateCount}</p>
                    </div>
                    <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-center">
                      <p className="text-[9px] font-mono font-bold text-rose-500 uppercase tracking-widest">Invalid Rows</p>
                      <p className="text-lg font-black text-rose-700 mt-0.5">{validationSummary.invalidCount}</p>
                    </div>
                  </div>

                  {/* Datagrid checklist table */}
                  <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b bg-slate-50 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                          <th className="py-2 px-3 text-center">Row</th>
                          <th className="py-2 px-3">Identity Badge</th>
                          <th className="py-2 px-3">Name</th>
                          <th className="py-2 px-3 text-center">Date</th>
                          <th className="py-2 px-3 text-center">Status</th>
                          <th className="py-2 px-3">Validation Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-[11px] font-semibold text-slate-600">
                        {parsedRows.map((r) => (
                          <tr key={r.rowNum} className={`hover:bg-slate-50/50 ${r.validation === "INVALID" ? "bg-rose-50/10 text-rose-650" : r.validation === "DUPLICATE" ? "bg-amber-50/10 text-amber-655" : ""}`}>
                            <td className="py-2 px-3 text-center text-slate-400 font-mono">{r.rowNum}</td>
                            <td className="py-2 px-3 font-mono text-slate-700">{r.badgeOrTemp}</td>
                            <td className="py-2 px-3 font-bold">{r.sewadarName}</td>
                            <td className="py-2 px-3 text-center font-mono text-slate-500">{r.date}</td>
                            <td className="py-2 px-3 text-center font-mono">
                              <span className={`px-1.5 py-0.5 text-[9px] rounded font-bold ${r.status === "Present" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[10px] font-medium leading-normal flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.validation === "VALID" ? "bg-emerald-500" : r.validation === "DUPLICATE" ? "bg-amber-450 animate-pulse" : "bg-rose-500"}`}></span>
                              <span>{r.message}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {parsedRows.length === 0 && !isParsing && (
                <div className="p-8 text-center text-slate-350 italic font-semibold border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                  Spreadsheet rows will load here automatically upon selecting a valid worksheet.
                </div>
              )}

            </div>
          </div>

          {/* Import Histography lists */}
          <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-550" />
              Spreadsheet Import Ledger History
            </h4>

            {excelImportLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic font-medium p-4 text-center">No imports logged during this workspace session.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-slate-50 text-[10px] font-mono text-slate-405 uppercase tracking-widest">
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Operator Name</th>
                      <th className="py-2.5 px-3">Log Information</th>
                      <th className="py-2.5 px-3">Source File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-[11px] font-semibold text-slate-650">
                    {excelImportLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/20">
                        <td className="py-2.5 px-3 font-mono text-slate-500">{new Date(log.dateTime).toLocaleString("en-US", { hour12: false })}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">{log.userEmail}</td>
                        <td className="py-2.5 px-3">{log.details}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-500">{log.fileName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
