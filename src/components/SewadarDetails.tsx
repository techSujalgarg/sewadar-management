/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Phone,
  User,
  Activity,
  Award,
  Upload,
  FileCheck,
  ClipboardList,
  ChevronRight,
  AlertCircle,
  Clock,
  Download,
  Trash2,
  Lock,
  MessageSquareCode,
  FileText
} from "lucide-react";
import { SewadarProfile, WorkflowStageKey, StageStatus, DocumentItem, UserRole, WORKFLOW_STAGES } from "../types";
import { EXECUTIVES } from "../mockData";

interface SewadarDetailsProps {
  sewadar: SewadarProfile;
  onBack: () => void;
  onUpdateWorkflowStage: (
    id: string,
    stageKey: WorkflowStageKey,
    updates: { status: StageStatus; remarks?: string; date?: string; assignedExecutive?: string }
  ) => void;
  onUpdateStatus: (id: string, status: SewadarProfile["status"]) => void;
  onAddDocument: (id: string, doc: Omit<DocumentItem, "id" | "uploadDate" | "version">) => void;
  onDeleteDocument: (id: string, docId: string) => void;
  currentRole: UserRole;
}

export default function SewadarDetails({
  sewadar,
  onBack,
  onUpdateWorkflowStage,
  onUpdateStatus,
  onAddDocument,
  onDeleteDocument,
  currentRole
}: SewadarDetailsProps) {
  // Local state to track which workflow stage tab the user is viewing
  const [selectedStageKey, setSelectedStageKey] = useState<WorkflowStageKey>("initial_interview");

  // Form edit fields for selected stage
  const currentStageData = sewadar.workflow[selectedStageKey];
  const [stageStatus, setStageStatus] = useState<StageStatus>(currentStageData.status);
  const [stageRemarks, setStageRemarks] = useState(currentStageData.remarks || "");
  const [stageDate, setStageDate] = useState(currentStageData.date || new Date().toISOString().split("T")[0]);
  const [stageExec, setStageExec] = useState(currentStageData.assignedExecutive || EXECUTIVES[0]);

  // Sync state values on switching stage tab
  const handleStageSelect = (key: WorkflowStageKey) => {
    setSelectedStageKey(key);
    const sd = sewadar.workflow[key];
    setStageStatus(sd.status);
    setStageRemarks(sd.remarks || "");
    setStageDate(sd.date || new Date().toISOString().split("T")[0]);
    setStageExec(sd.assignedExecutive || EXECUTIVES[0]);
  };

  // Mock Upload state
  const [newDocName, setNewDocName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // RBAC definitions
  const isViewer = currentRole === "viewer";
  const isExecutive = currentRole === "executive";
  const isAdminOrSuper = currentRole === "admin" || currentRole === "super_admin";

  const canEditWorkflow = currentRole === "super_admin" || currentRole === "executive";
  const canEditStatus = currentRole === "super_admin" || currentRole === "admin";
  const canManageDocs = currentRole !== "viewer";

  // Handle saving the currently selected workflow stage updates
  const handleSaveStage = () => {
    if (isViewer) return;
    onUpdateWorkflowStage(sewadar.id, selectedStageKey, {
      status: stageStatus,
      remarks: stageRemarks,
      date: stageDate,
      assignedExecutive: stageExec
    });
    alert(`Success: ${selectedStageKey.replace(/_/g, " ")} status updated standard!`);
  };

  // Handle direct file generation simulation
  const handleMockUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName) return;

    setIsUploading(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          onAddDocument(sewadar.id, {
            name: newDocName,
            type: "pdf",
            url: "#",
            size: `${(1 + Math.random() * 2).toFixed(1)} MB`
          });
          setIsUploading(false);
          setNewDocName("");
          setUploadProgress(0);
          alert("File verified and uploaded standard!");
        }, 300);
      }
    }, 150);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl border border-slate-150 transition-all self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to List
        </button>

        <div className="flex items-center space-x-3">
          {/* Progress gauge */}
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">Comprehensive progress</span>
            <span className="text-sm font-bold font-mono text-slate-700">{sewadar.progress}% Completed</span>
          </div>

          <div className="w-16 bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${sewadar.progress < 50 ? "bg-amber-400" : "bg-emerald-500"}`}
              style={{ width: `${sewadar.progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 2. Top-level details (Grid arrangement) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Photo & Base Personal Specifications */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col items-center text-center">
            {/* Photograph layout */}
            <div className="w-24 h-24 rounded-full bg-slate-50 border-4 border-slate-100 overflow-hidden shadow-sm mb-4 relative group">
              {sewadar.photographUrl ? (
                <img src={sewadar.photographUrl} alt={sewadar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full font-bold text-indigo-500 bg-indigo-50 flex items-center justify-center text-3xl font-sans">
                  {sewadar.name.charAt(0)}
                </div>
              )}
            </div>

            <h3 className="text-base font-bold text-slate-800">{sewadar.name}</h3>
            <span className="text-xs font-mono font-medium text-slate-400 mt-1 flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              {sewadar.badgeNumber || `Temp Sequence: ${sewadar.tempNumber}`}
            </span>
          </div>

          {/* Quick specs section */}
          <div className="space-y-4 pt-4 border-t border-slate-50 text-xs font-medium text-slate-600">
            {/* Enrollment Status select indicator */}
            <div>
              <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5 flex justify-between">
                Current Status
                {isViewer && <Lock className="w-3 h-3 text-slate-300" />}
              </label>
              <select
                className="w-full p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/20 text-slate-700 font-semibold cursor-pointer"
                disabled={!canEditStatus}
                value={sewadar.status}
                onChange={(e) => onUpdateStatus(sewadar.id, e.target.value as any)}
              >
                <option value="Active">Active Enrolment</option>
                <option value="Completed">Completed / Approved Force</option>
                <option value="Hold">On Hold</option>
                <option value="Rejected">Rejected</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Location coordinates */}
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">Sewa Base Location</span>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">{sewadar.location}</p>
              </div>
            </div>

            {/* Mobile Contact info */}
            <div className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">Contact Lines</span>
                <p className="text-slate-700 font-semibold mt-0.5">{sewadar.contactNumber}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Emergency: {sewadar.emergencyContact}</p>
              </div>
            </div>

            {/* Gender / DOB */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block">Gender</span>
                  <p className="text-slate-700 font-semibold mt-0.5">{sewadar.gender}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block">DOB</span>
                  <p className="text-slate-700 font-semibold mt-0.5">{new Date(sewadar.dob).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Residential address specification */}
            <div>
              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest block">Residence Address</span>
              <p className="text-slate-700 font-semibold mt-1 p-2 bg-slate-50/50 rounded-lg border border-slate-100">{sewadar.address}</p>
            </div>
          </div>
        </div>

        {/* Right span 2: Unified Enrollment Workflow checklist & Step updates */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100">
          
          {/* Left panel of workflow card: 11-step interactive vertical navigation */}
          <div className="w-full md:w-5/12 p-5 overflow-y-auto max-h-[520px]">
            <h4 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400 mb-4 inline-flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-indigo-500" />
              Workflow checkpoints
            </h4>
            
            <div className="space-y-1.5">
              {WORKFLOW_STAGES.map((st, index) => {
                const stageData = sewadar.workflow[st.key];
                const isCurrent = selectedStageKey === st.key;
                
                return (
                  <div
                    key={st.key}
                    onClick={() => handleStageSelect(st.key)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${isCurrent ? "bg-indigo-50/80 border-indigo-200 text-indigo-700 font-semibold" : "border-slate-50 bg-slate-50/20 hover:bg-slate-50 text-slate-600"}`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {/* Numeric Badge indicating sequence */}
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[9px] font-bold ${stageData.status === "completed" ? "bg-emerald-500 text-white" : stageData.status === "in_progress" ? "bg-indigo-600 text-white animate-pulse" : stageData.status === "failed" ? "bg-rose-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                        {index + 1}
                      </span>
                      <span className="text-xs truncate">{st.label}</span>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {/* Tick or indicator */}
                      {stageData.status === "completed" && <FileCheck className="w-4 h-4 text-emerald-500" />}
                      {stageData.status === "in_progress" && <Clock className="w-3.5 h-3.5 text-indigo-500 animate-spin" />}
                      {stageData.status === "failed" && <AlertCircle className="w-4 h-4 text-rose-500 animate-bounce" />}
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isCurrent ? "translate-x-0.5 text-indigo-600" : "text-slate-300"}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right panel of workflow card: Update and details block */}
          <div className="w-full md:w-7/12 p-6 flex flex-col justify-between">
            <div>
              <div className="border-b border-slate-100 pb-3 mb-5">
                <span className="text-[10px] font-bold font-mono text-primary bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Check-point Detail
                </span>
                <h4 className="text-sm font-bold text-slate-800 mt-2">
                  {WORKFLOW_STAGES.find((s) => s.key === selectedStageKey)?.label}
                </h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">Assigned to: {stageExec}</p>
              </div>

              {/* Form panel for stage configuration */}
              <div className="space-y-4 text-xs font-medium text-slate-600">
                {/* Status select for block */}
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Checkpoint Status</label>
                  <div className="flex items-center space-x-2.5">
                    {["pending", "in_progress", "completed", "failed"].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => !isViewer && setStageStatus(st as any)}
                        disabled={isViewer || !canEditWorkflow}
                        className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all ${stageStatus === st ? st === "completed" ? "bg-emerald-50 border-emerald-200 text-emerald-600 font-bold" : st === "failed" ? "bg-rose-50 border-rose-200 text-rose-600 font-bold" : st === "in_progress" ? "bg-indigo-50 border-indigo-200 text-indigo-600 font-bold" : "bg-slate-100 border-slate-300 text-slate-600" : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                      >
                        {st.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assigned Executive */}
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Lead Executive Officer</label>
                  <select
                    className="w-full p-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                    disabled={isViewer || !canEditWorkflow}
                    value={stageExec}
                    onChange={(e) => setStageExec(e.target.value)}
                  >
                    {EXECUTIVES.map((ex) => (
                      <option key={ex} value={ex}>
                        {ex}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Updated Action Date */}
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Completion / Update Date</label>
                  <input
                    type="date"
                    className="w-full p-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                    disabled={isViewer || !canEditWorkflow}
                    value={stageDate}
                    onChange={(e) => setStageDate(e.target.value)}
                  />
                </div>

                {/* Checklist remarks */}
                <div>
                  <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Executive Review Notes / Remarks</label>
                  <textarea
                    rows={3}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none"
                    placeholder="Provide specific notes regarding verification parameters, certificates, or pending items..."
                    disabled={isViewer || !canEditWorkflow}
                    value={stageRemarks}
                    onChange={(e) => setStageRemarks(e.target.value)}
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Action buttons footer */}
            <div className="border-t border-slate-100 pt-4 mt-6 flex justify-end">
              {isViewer ? (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Read-only mode active
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveStage}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4" />
                  Apply Stage Updates
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Document Management Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-150">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-500" />
            <h4 className="text-sm font-bold text-slate-800">Verification & ID Document Vault</h4>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Stored files: {sewadar.documents.length} records standard
          </span>
        </div>

        {/* Form to simulate file uploads */}
        {canManageDocs && (
          <form onSubmit={handleMockUpload} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-dashed border-slate-200 text-xs font-semibold">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest mb-1.5">Document Label Name</label>
              <input
                type="text"
                placeholder="e.g. Ground Verification Report, Police clearance standard pdf"
                className="w-full p-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                required
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={isUploading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 text-white font-bold py-2 px-4 rounded-xl inline-flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <Upload className="w-4 h-4 animate-bounce" />
                {isUploading ? `Uploading... ${uploadProgress}%` : "Attach File (PDF/PNG)"}
              </button>
            </div>
          </form>
        )}

        {/* List of files with download / deletion tracking */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sewadar.documents.length === 0 ? (
            <div className="col-span-full py-6 text-center text-slate-400 font-mono text-xs">
              No files securely attached. Please upload standard verified documents.
            </div>
          ) : (
            sewadar.documents.map((doc) => (
              <div key={doc.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/20 hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="p-2 ml-1 bg-indigo-50 text-indigo-600 rounded-lg flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-700 truncate">{doc.name}</h5>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {doc.size} • Ver. {doc.version} c. {doc.uploadDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 flex-shrink-0">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(`Simulation: System downloaded certificate file '${doc.name}' securely standard.`);
                    }}
                    className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md block text-[10px] font-bold"
                    title="Mock Download File"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  {canManageDocs && (
                    <button
                      onClick={() => {
                        if (confirm(`Revoke / Delete documentation file: ${doc.name}?`)) {
                          onDeleteDocument(sewadar.id, doc.id);
                        }
                      }}
                      className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg block"
                      title="De-attach Verification file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
