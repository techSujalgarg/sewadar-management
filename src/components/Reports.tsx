/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import {
  FileText,
  Download,
  Printer,
  ChevronRight,
  TrendingUp,
  MapPin,
  Clock,
  UserCheck,
  CheckSquare,
  Sparkles
} from "lucide-react";
import { SewadarProfile, AttendanceRecord, WORKFLOW_STAGES } from "../types";
import { LOCATIONS } from "../mockData";

interface ReportsProps {
  sewadars: SewadarProfile[];
  attendance: AttendanceRecord[];
}

interface ReportType {
  id: string;
  title: string;
  description: string;
  category: "Activity" | "Performance" | "Audit";
}

export default function Reports({ sewadars, attendance }: ReportsProps) {
  const [selectedReportId, setSelectedReportId] = useState("daily_summary");

  const REPORTS_LIST: ReportType[] = [
    { id: "daily_summary", title: "Daily Enrollment & Active Summary", description: "Consolidated metrics of active enrollments, warning states, and milestone ratios.", category: "Activity" },
    { id: "location_spread", title: "Location Wise Performance Report", description: "Clustered distribution analysis showing regional chapter performance and pending queues.", category: "Performance" },
    { id: "pending_verification", title: "Pending Cases & Aging SLA Audit", description: "Targeted lists highlighting candidates with pending ground or cyber verification.", category: "Audit" },
    { id: "attendance_registry", title: "Attendance & Daily Presence Logs", description: "Detailed check-in logs and average presence counts for tracking devotion metrics.", category: "Activity" }
  ];

  // Dynamically compute report items based on selected report
  const computedReportData = useMemo(() => {
    const list: any[] = [];
    let headers: string[] = [];

    if (selectedReportId === "daily_summary") {
      headers = ["Metric Category", "Total Count", "System Percentage", "Status SLA"];
      
      const total = sewadars.length;
      const active = sewadars.filter(s => s.status === "Active").length;
      const completed = sewadars.filter(s => s.status === "Completed").length;
      const onHold = sewadars.filter(s => s.status === "Hold").length;
      const averageProgress = total
        ? Math.round(sewadars.reduce((acc, s) => acc + s.progress, 0) / total)
        : 0;

      list.push({ category: "Total Registered", count: total, percentage: "100%", status: "System Capacity" });
      list.push({ category: "Active Enrolments", count: active, percentage: `${Math.round((active / (total || 1)) * 100)}%`, status: "Processing Queue" });
      list.push({ category: "Sewa Badge Issued", count: completed, percentage: `${Math.round((completed / (total || 1)) * 100)}%`, status: "Approved" });
      list.push({ category: "On Explicit Hold", count: onHold, percentage: `${Math.round((onHold / (total || 1)) * 100)}%`, status: "Action Required" });
      list.push({ category: "Average Workflow Progress", count: `${averageProgress}%`, percentage: "N/A", status: "Aggregated Average" });

    } else if (selectedReportId === "location_spread") {
      headers = ["Location Branch", "Total Sewadars", "Completed (Badge Issued)", "Average Progress %", "Hold Cases"];
      
      LOCATIONS.forEach((loc) => {
        const shortLoc = loc.split(",")[0];
        const matchSewadars = sewadars.filter(s => s.location === loc);
        const lTotal = matchSewadars.length;
        const lCompleted = matchSewadars.filter(s => s.status === "Completed").length;
        const avgPList = matchSewadars.map(s => s.progress);
        const lAvgProgress = lTotal ? Math.round(avgPList.reduce((acc, x) => acc + x, 0) / lTotal) : 0;
        const lHold = matchSewadars.filter(s => s.status === "Hold").length;

        list.push({
          location: shortLoc,
          total: lTotal,
          completed: lCompleted,
          avgProgress: `${lAvgProgress}%`,
          hold: lHold
        });
      });

    } else if (selectedReportId === "pending_verification") {
      headers = ["Sewadar ID", "Name", "Enrolled Date", "Workflow Phase Status", "Aging (SLA Status)"];
      
      const now = new Date("2026-06-05T04:49:38Z");
      sewadars.forEach((s) => {
        if (s.status !== "Completed" && s.status !== "Rejected") {
          const created = new Date(s.createdDate);
          const ageDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          const verifyStatus = s.workflow.verification.status;
          
          let agingSla = "Normal";
          if (ageDays > 30) agingSla = "Critical (SLA Breached)";
          else if (ageDays >= 15) agingSla = "Warning (Close to SLA)";

          list.push({
            id: s.badgeNumber || s.tempNumber,
            name: s.name,
            date: s.createdDate,
            phase: `Verification: ${verifyStatus.replace(/_/g, " ").toUpperCase()}`,
            aging: `${ageDays} Days (${agingSla})`
          });
        }
      });

    } else if (selectedReportId === "attendance_registry") {
      headers = ["Sewadar Name", "Total Days Observed", "Days Present (or HD)", "Leave Days", "Inferred Devotion Rate %"];
      
      sewadars.forEach((s) => {
        const sAtts = attendance.filter(a => a.sewadarId === s.id);
        const totalDays = sAtts.length;
        const presentDays = sAtts.filter(a => a.status === "Present" || a.status === "HalfDay").length;
        const leaveDays = sAtts.filter(a => a.status === "Leave").length;
        const devRate = totalDays ? Math.round((presentDays / totalDays) * 100) : 100;

        list.push({
          name: s.name,
          observed: totalDays,
          present: presentDays,
          leave: leaveDays,
          rate: `${devRate}%`
        });
      });
    }

    return { headers, list };
  }, [sewadars, attendance, selectedReportId]);

  // Client-Side CSV String Builder & Download triggers
  const handleExportCSV = () => {
    const { headers, list } = computedReportData;
    if (!headers.length || !list.length) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Assemble Headers row
    csvContent += headers.join(",") + "\n";

    // Assemble Data rows
    list.forEach((row) => {
      const values = Object.values(row).map((val) => `"${String(val).replace(/"/g, '""')}"`);
      csvContent += values.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedReportId}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert(`Export complete: '${selectedReportId}' file has been downloaded successfully standard!`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left panel: list of available reports card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h4 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-50 pb-2 mb-2">
          <FileText className="w-4 h-4 text-indigo-500" />
          General Reports List
        </h4>

        <div className="space-y-2">
          {REPORTS_LIST.map((rep) => {
            const isSelected = selectedReportId === rep.id;
            return (
              <div
                key={rep.id}
                onClick={() => setSelectedReportId(rep.id)}
                className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-3 ${isSelected ? "bg-indigo-50 border-indigo-200 text-indigo-750" : "bg-slate-50/20 hover:bg-slate-50 border-slate-100 text-slate-600"}`}
              >
                {/* Visual type category */}
                <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${isSelected ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>
                  <FileText className="w-4 h-4" />
                </div>

                <div className="min-w-0">
                  <h5 className="text-xs font-bold font-sans line-clamp-1">{rep.title}</h5>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1 line-clamp-2">{rep.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Informative summary instructions */}
        <div className="pt-4 border-t border-slate-50 text-[10px] text-slate-400 leading-relaxed font-semibold">
          * Dynamic parameters compile instantly. These files assemble straight on the client in raw CSV matrix form and bypass database latency safely standard.
        </div>
      </div>

      {/* Right panel: Active preview & Actions (Span 2) */}
      <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5 flex flex-col justify-between">
        
        {/* Preview header logs */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3 mb-5 p-2 bg-slate-50/20 rounded-xl">
            <div>
              <span className="text-[9px] font-bold font-mono uppercase bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-md">
                Active Report Preview
              </span>
              <h3 className="text-sm font-bold text-slate-800 mt-2">
                {REPORTS_LIST.find((r) => r.id === selectedReportId)?.title}
              </h3>
            </div>

            {/* Export tools */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportCSV}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-1.5 px-3.5 rounded-xl inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV/Excel
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs py-1.5 px-3.5 rounded-xl inline-flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / PDF
              </button>
            </div>
          </div>

          {/* Table metrics rendering */}
          <div className="overflow-x-auto min-h-[220px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-50/30">
                  {computedReportData.headers.map((h, i) => (
                    <th key={i} className="py-2.5 px-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[11px] font-semibold text-slate-600">
                {computedReportData.list.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/40">
                    {Object.values(row).map((val: any, cIdx) => (
                      <td key={cIdx} className="py-2.5 px-3">
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer info logs */}
        <div className="pt-3 border-t border-slate-50 text-[10px] text-zinc-400 font-mono text-right flex justify-between items-center px-1">
          <span>Observed Reference Local Time: 2026-06-05</span>
          <span>Sewa samiti records division standard</span>
        </div>
      </div>
    </div>
  );
}
