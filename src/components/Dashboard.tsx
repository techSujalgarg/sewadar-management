/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Users,
  CheckCircle,
  FileText,
  AlertTriangle,
  Clock,
  TrendingUp,
  MapPin,
  GitPullRequest,
  CalendarDays,
  UserCheck,
} from "lucide-react";
import { SewadarProfile, AttendanceRecord, WORKFLOW_STAGES } from "../types";

interface DashboardProps {
  sewadars: SewadarProfile[];
  attendance: AttendanceRecord[];
  onSelectSewadar: (id: string) => void;
}

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4", "#8b5cf6", "#ec4899"];

export default function Dashboard({ sewadars, attendance, onSelectSewadar }: DashboardProps) {
  // 1. KPI Calculations
  const metrics = useMemo(() => {
    const total = sewadars.length;
    const active = sewadars.filter((s) => s.status === "Active" || s.status === "Completed").length;
    const hold = sewadars.filter((s) => s.status === "Hold").length;
    const rejected = sewadars.filter((s) => s.status === "Rejected").length;

    // Average progress
    const avgProgress = total
      ? Math.round(sewadars.reduce((sum, s) => sum + s.progress, 0) / total)
      : 0;

    // Aging: calculate days pending for each
    // Critical: > 30 days pending, Warning: 15-30 days pending
    let criticalCount = 0;
    let warningCount = 0;

    const oneDayMs = 24 * 60 * 60 * 1000;
    const now = new Date("2026-06-05T04:49:38Z"); // standard reference time

    sewadars.forEach((s) => {
      if (s.status !== "Completed" && s.status !== "Rejected") {
        const created = new Date(s.createdDate);
        const diffDays = Math.floor((now.getTime() - created.getTime()) / oneDayMs);
        if (diffDays > 30) {
          criticalCount++;
        } else if (diffDays >= 15) {
          warningCount++;
        }
      }
    });

    // Medical or Verification Pending
    const pendingVerification = sewadars.filter((s) => s.workflow.verification.status !== "completed" && s.status !== "Rejected").length;
    const pendingMedical = sewadars.filter((s) => s.workflow.medical.status !== "completed" && s.status !== "Rejected" && s.status !== "Completed").length;
    const pendingBadge = sewadars.filter((s) => s.workflow.sewa_badge.status !== "completed" && s.status === "Active" && s.progress >= 90).length;

    return {
      total,
      active,
      hold,
      rejected,
      avgProgress,
      criticalCount,
      warningCount,
      pendingVerification,
      pendingMedical,
      pendingBadge,
    };
  }, [sewadars]);

  // 2. Chart data prep: Enrollment Type
  const enrollmentTypeData = useMemo(() => {
    const counts: Record<string, number> = { New: 0, Revival: 0, Transfer: 0 };
    sewadars.forEach((s) => {
      counts[s.enrollmentType] = (counts[s.enrollmentType] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [sewadars]);

  // 3. Chart data prep: Location distribution
  const locationData = useMemo(() => {
    const counts: Record<string, number> = {};
    sewadars.forEach((s) => {
      const shortLoc = s.location.split(",")[0];
      counts[shortLoc] = (counts[shortLoc] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [sewadars]);

  // 4. Chart data prep: Stage-wise distribution
  const stageData = useMemo(() => {
    return WORKFLOW_STAGES.map((stage) => {
      const count = sewadars.filter((s) => {
        if (s.status === "Completed") return stage.key === "sewa_badge";
        // Find current stage (the first stage that is in_progress, else the latest completed)
        const currentStageKey = Object.keys(s.workflow).find(
          (key) => s.workflow[key as any].status === "in_progress"
        );
        if (currentStageKey) return currentStageKey === stage.key;
        
        // If not explicit in_progress, find index
        const stagesKeys = WORKFLOW_STAGES.map(xs => xs.key);
        const lastCompletedIdx = stagesKeys.reduce((acc, key, idx) => {
          if (s.workflow[key as any].status === "completed") return idx;
          return acc;
        }, -1);
        if (lastCompletedIdx === -1) return stage.key === "initial_interview";
        return stagesKeys[Math.min(lastCompletedIdx + 1, stagesKeys.length - 1)] === stage.key;
      }).length;

      return {
        name: stage.label.split(" (")[0].substring(0, 15) + (stage.label.length > 15 ? ".." : ""),
        count,
      };
    });
  }, [sewadars]);

  // 5. Chart data prep: Attendance Performance Trend
  const attendanceTrendData = useMemo(() => {
    // Unique list of dates in historical records of attendance
    const dates = Array.from(new Set(attendance.map((a) => a.date))).sort();
    return dates.map((date) => {
      const dayRecs = attendance.filter((a) => a.date === date);
      const presentCount = dayRecs.filter((a) => a.status === "Present" || a.status === "HalfDay").length;
      const pct = dayRecs.length ? Math.round((presentCount / dayRecs.length) * 100) : 0;
      return {
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        "Presence %": pct,
      };
    });
  }, [attendance]);

  // 6. Needs Attention Priority List (Critical Cases or Rejected or Holds)
  const needsAttentionList = useMemo(() => {
    const oneDayMs = 24 * 60 * 60 * 1000;
    const now = new Date("2026-06-05T04:49:38Z");

    return sewadars
      .map((s) => {
        const created = new Date(s.createdDate);
        const ageDays = Math.floor((now.getTime() - created.getTime()) / oneDayMs);
        
        let priority: "High" | "Medium" | "Low" = "Low";
        let reason = "Normal status processing.";

        if (s.status === "Hold") {
          priority = "High";
          reason = "Enrolment explicitly put on HOLD standard.";
        } else if (s.status === "Rejected") {
          priority = "High";
          reason = "Application Rejected during validation.";
        } else if (ageDays > 30 && s.status !== "Completed") {
          priority = "High";
          reason = `Critical Aging: Stuck in queue for ${ageDays} days.`;
        } else if (ageDays >= 15 && s.status !== "Completed") {
          priority = "Medium";
          reason = `Warning Aging: ${ageDays} days in progression pipeline.`;
        } else if (s.workflow.verification.status === "failed") {
          priority = "High";
          reason = "Background or Cyber verification failed.";
        }

        return { ...s, ageDays, priority, reason };
      })
      .filter((s) => s.priority === "High" || s.priority === "Medium")
      .sort((a, b) => b.ageDays - a.ageDays) // Most aged first
      .slice(0, 5);
  }, [sewadars]);

  // 7. Top Sewadars by attendance rate + progress
  const topPerformers = useMemo(() => {
    return sewadars
      .map((s) => {
        const matchingAtt = attendance.filter((a) => a.sewadarId === s.id);
        const presentCount = matchingAtt.filter((a) => a.status === "Present" || a.status === "HalfDay").length;
        const rate = matchingAtt.length ? Math.round((presentCount / matchingAtt.length) * 100) : 100;
        return { ...s, attendanceRate: rate };
      })
      .filter((s) => s.status !== "Rejected" && s.progress > 50)
      .sort((a, b) => b.attendanceRate - a.attendanceRate || b.progress - a.progress)
      .slice(0, 4);
  }, [sewadars, attendance]);

  return (
    <div className="space-y-6">
      {/* 2. Graphical Bento Grid Layout (12-column grid system) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        
        {/* Row 1, Card A: Total Enrolled Sewadars (4 Columns) */}
        <div id="bento-kpi-total" className="lg:col-span-4 bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_-8px_rgba(99,102,241,0.12)] hover:border-indigo-150 transition-all duration-300 flex flex-col justify-between group">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-indigo-50/80 rounded-2xl text-indigo-600 group-hover:scale-105 transition-transform duration-300">
              <Users className="w-6 h-6" />
            </div>
            <span className="p-1 px-2.5 bg-indigo-50 text-indigo-650 rounded-lg text-[9px] font-bold font-mono tracking-wider uppercase">
              Operational Force
            </span>
          </div>
          <div className="mt-6">
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Total Registered</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-4xl font-extrabold font-sans text-slate-900 tracking-tight">{metrics.total}</h3>
              <span className="text-xs text-indigo-605 font-semibold">Profiles Active</span>
            </div>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-50">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-505" />
              Real-time synchronization active
            </p>
          </div>
        </div>

        {/* Row 1, Card B: Active Force Indicator (4 Columns) */}
        <div id="bento-kpi-active" className="lg:col-span-4 bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_-8px_rgba(16,185,129,0.12)] hover:border-emerald-150 transition-all duration-300 flex flex-col justify-between group">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-emerald-50/80 rounded-2xl text-emerald-600 group-hover:scale-105 transition-transform duration-300">
              <CheckCircle className="w-6 h-6" />
            </div>
            <span className="p-1 px-2.5 bg-emerald-50 text-emerald-650 rounded-lg text-[9px] font-bold font-mono tracking-wider uppercase">
              Active Ratio
            </span>
          </div>
          <div className="mt-6">
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Active Force</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-4xl font-extrabold font-sans text-slate-900 tracking-tight">{metrics.active}</h3>
              <span className="text-xs text-emerald-600 font-bold">
                {Math.round((metrics.active / (metrics.total || 1)) * 100)}% Engagement
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-50">
              <UserCheck className="w-3.5 h-3.5 text-emerald-505" />
              Verified deployment ready
            </p>
          </div>
        </div>

        {/* Row 1, Card C: Process Completion Gauge (4 Columns) */}
        <div id="bento-kpi-progress" className="lg:col-span-4 bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_-8px_rgba(6,182,212,0.12)] hover:border-cyan-150 transition-all duration-300 flex flex-col justify-between group">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-cyan-50/80 rounded-2xl text-cyan-600 group-hover:scale-105 transition-transform duration-300">
              <GitPullRequest className="w-6 h-6" />
            </div>
            <span className="p-1 px-2.5 bg-cyan-50 text-cyan-650 rounded-lg text-[9px] font-bold font-mono tracking-wider uppercase">
              L&D Completion
            </span>
          </div>
          <div className="mt-6">
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Avg Progress</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-4xl font-extrabold font-sans text-slate-950 tracking-tight">{metrics.avgProgress}%</h3>
              <span className="text-xs text-cyan-600 font-semibold">Average pipeline speed</span>
            </div>
            <div className="mt-3.5 pt-3 border-t border-slate-50">
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${metrics.avgProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Central Workstage Distribution (8 Columns) & Enrollment Type Pie (4 Columns) */}
        {/* Stat detail block / Stage distribution */}
        <div id="bento-chart-stages" className="lg:col-span-8 bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 font-sans tracking-tight">Stage Wise Distribution</h4>
              <p className="text-xs text-slate-400 mt-1">Status details of candidates active at each checkpoint</p>
            </div>
            <span className="p-1.5 px-3 bg-slate-50 text-slate-650 border border-slate-100 rounded-xl text-[10px] font-semibold font-mono">
              11 Continuous Checkpoints
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={0} angle={-15} textAnchor="end" height={55} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "16px", border: "none", color: "#fff", fontSize: "11px" }}
                  itemStyle={{ color: "#38bdf8" }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={26}>
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Enrollment Type split Pie (4 Columns) */}
        <div id="bento-chart-pie" className="lg:col-span-4 bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 font-sans tracking-tight">Enrollment Matrix</h4>
            <p className="text-xs text-slate-400 mt-1">New, transfers, and revived profiles ratio</p>
          </div>
          <div className="h-44 flex items-center justify-center relative my-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={enrollmentTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {enrollmentTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "16px", border: "none", color: "#fff", fontSize: "11px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black font-sans text-slate-800 leading-none">{metrics.total}</span>
              <span className="text-[9px] font-mono font-bold text-slate-400 mt-1 uppercase tracking-widest">Enrolled</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 text-center pt-3 border-t border-slate-50">
            {enrollmentTypeData.map((item, index) => (
              <div key={item.name} className="truncate">
                <p className="text-xs font-bold text-slate-800">{item.value}</p>
                <p className="text-[9px] text-slate-400 inline-flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  {item.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Location Spread (7 Columns) & Attendance Analysis Area (5 Columns) */}
        <div id="bento-chart-locations" className="lg:col-span-7 bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-800 font-sans tracking-tight">Geographic Spread</h4>
              <p className="text-xs text-slate-400 mt-1">Sewadar counts clustered by regional Sewa chapters</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 font-bold uppercase">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Locational nodes
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f8fafc" />
                <XAxis type="number" tick={{ fontSize: 9, fill: "#94a3b8" }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "16px", border: "none", color: "#fff", fontSize: "11px" }}
                  itemStyle={{ color: "#10b981" }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Area Chart (5 Columns) */}
        <div id="bento-chart-attendance" className="lg:col-span-5 bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <h4 className="text-sm font-semibold text-slate-800 font-sans tracking-tight">Devotion Trend Metrics</h4>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-mono font-bold flex items-center gap-1 select-none">
                <TrendingUp className="w-3 h-3" /> High Integrity
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Active daily attendance percentage trend (Past 5 registry days)</p>
          </div>
          <div className="h-64 my-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPresence" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "16px", border: "none", color: "#fff", fontSize: "11px" }}
                  itemStyle={{ color: "#818cf8" }}
                />
                <Area type="monotone" dataKey="Presence %" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPresence)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 4: SLA Monitor & Alerts Core (4 Columns) & Priority Attention Grid (8 Columns) */}
        <div id="bento-sla-hub" className="lg:col-span-4 bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] flex flex-col justify-between group">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 font-sans tracking-tight">Milestone SLA Monitors</h4>
            <p className="text-xs text-slate-400 mt-1">Pipeline bottlenecks & regulatory exceptions tracker</p>
          </div>
          <div className="space-y-4 my-6">
            {/* Critical Row */}
            <div className="flex items-center justify-between p-3.5 bg-rose-50/50 rounded-2xl border border-rose-100/60 hover:bg-rose-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Critical (&gt;30 Days)</h5>
                  <p className="text-[10px] text-slate-400 font-medium">Overdue milestones</p>
                </div>
              </div>
              <h3 className="text-2xl font-black font-mono text-rose-600 pr-1">{metrics.criticalCount}</h3>
            </div>

            {/* Warning Row */}
            <div className="flex items-center justify-between p-3.5 bg-amber-50/50 rounded-2xl border border-amber-100/60 hover:bg-amber-50 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Warning (15-30 Days)</h5>
                  <p className="text-[10px] text-slate-400 font-medium font-semibold">Approaching limits</p>
                </div>
              </div>
              <h3 className="text-2xl font-black font-mono text-amber-650 pr-1">{metrics.warningCount}</h3>
            </div>

            {/* Doc Verif Queue */}
            <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-2xl border border-slate-100 hover:bg-slate-100/60 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-200 text-slate-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Pending Verification</h5>
                  <p className="text-[10px] text-slate-400 font-semibold font-medium">Ground/cyber verifications</p>
                </div>
              </div>
              <h3 className="text-xl font-bold font-mono text-slate-700 pr-1">{metrics.pendingVerification}</h3>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 leading-normal font-medium bg-slate-50/60 p-3 rounded-xl border border-slate-100">
            * Automatic notifications dispatched to assigned executive leads upon SLA milestone entry standard.
          </div>
        </div>

        {/* Needs Attention List Table (8 Columns) */}
        <div id="section-attention" className="lg:col-span-8 bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h4 className="text-sm font-semibold text-slate-850 font-sans tracking-tight">Active SLA Breach Flagged</h4>
              </div>
              <span className="text-[9px] bg-rose-50 text-rose-650 border border-rose-100 font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md">
                Critical SLA Queue
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-slate-50/40">
                    <th className="py-2.5 px-3">Sewadar Name</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3 text-center">Progress %</th>
                    <th className="py-2.5 px-3 text-center">In Queue</th>
                    <th className="py-2.5 px-3">Primary Alert Core Reason</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600 font-medium">
                  {needsAttentionList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center font-mono text-slate-400 text-xs">
                        All clean. No cases are currently flagging SLAs!
                      </td>
                    </tr>
                  ) : (
                    needsAttentionList.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="py-3 px-3 font-bold text-slate-800 text-xs">{s.name}</td>
                        <td className="py-3 px-3 text-slate-500 text-[10px] font-semibold">{s.location.split(",")[0]}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <span className="text-xs font-mono font-bold text-slate-700">{s.progress}%</span>
                            <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${s.progress < 30 ? "bg-rose-500" : s.progress < 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                                style={{ width: `${s.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-xs">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.ageDays > 30 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-amber-50 text-amber-600 border border-amber-100"}`}>
                            {s.ageDays} d
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-xs max-w-[180px] truncate" title={s.reason}>{s.reason}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => onSelectSewadar(s.id)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-805 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-all"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-4 text-[10px] font-medium font-mono text-slate-400 text-right">
            SLA parameters checked: 15-day warning check, 30-day critical barrier.
          </div>
        </div>

        {/* Row 5: Top Performers (12 Columns - Full panoramic visual) */}
        <div id="section-performers" className="lg:col-span-12 bg-white p-6 rounded-[24px] border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              <h4 className="text-sm font-semibold text-slate-800 font-sans tracking-tight">Top Performing Sewadars Spotlight</h4>
            </div>
            <span className="text-[10px] bg-emerald-50 text-emerald-650 font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              Attendance Leaderboard
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {topPerformers.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/40 hover:bg-slate-50 border border-slate-100 transition-all group hover:scale-[1.01] duration-200">
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs ring-2 ring-white overflow-hidden flex-shrink-0">
                    {s.photographUrl ? (
                      <img src={s.photographUrl} alt={s.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      s.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-650 transition-colors">{s.name}</h5>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5 truncate">{s.badgeNumber || s.tempNumber}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-bold text-emerald-650">{s.attendanceRate}% Presence</div>
                  <div className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mt-0.5 font-bold">100% active</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3.5 border-t border-slate-50 text-[10px] text-slate-400 font-medium flex justify-between items-center bg-slate-50/20 px-3 py-2 rounded-xl">
            <span>Aggregated from live daily attendance records & checkpoint integrity factors.</span>
            <span className="font-bold text-indigo-600 uppercase font-mono">Secured Ledger Mode</span>
          </div>
        </div>

      </div>
    </div>
  );
}
