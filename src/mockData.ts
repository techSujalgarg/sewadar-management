/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SewadarProfile, AttendanceRecord, NotificationLog, AuditLog, WorkflowStageKey, StageProgress } from "./types";

export const LOCATIONS = [
  "Main Darbar Sahib, Amritsar",
  "Sewa Samiti Office, Delhi",
  "Sector 34 Gurudwara, Chandigarh",
  "Sewa Center, Mumbai",
  "Jalandhar Cantonment Campus",
  "Kolkata Civic Center",
  "Ludhiana Central Hall"
];

export const EXECUTIVES = [
  "Sardar Baldev Singh (HOD)",
  "Harsh Vardhan (Verification Head)",
  "Jaspreet Kaur (Operations Lead)",
  "Amit Pal Singh (Medical Officer)",
  "Ravinder Khanna (General Admin)"
];

const createInitialWorkflow = (completedCount: number, customOverrides: Partial<Record<WorkflowStageKey, Partial<StageProgress>>> = {}): Record<WorkflowStageKey, StageProgress> => {
  const keys: WorkflowStageKey[] = [
    "initial_interview",
    "application_form",
    "meeting_hod",
    "verification",
    "temporary_number",
    "probation",
    "sewa_samiti_form",
    "document_verification",
    "medical",
    "submission",
    "sewa_badge"
  ];

  const workflow: Record<WorkflowStageKey, StageProgress> = {} as any;

  keys.forEach((key, index) => {
    let status: "pending" | "in_progress" | "completed" | "failed" = "pending";
    let date = "";
    let remarks = "";
    let assignedExecutive = EXECUTIVES[index % EXECUTIVES.length];

    if (index < completedCount) {
      status = "completed";
      const daysAgo = 15 - index;
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      date = d.toISOString().split("T")[0];
      remarks = `${key.replace(/_/g, " ")} was successfully completed and reviewed.`;
    } else if (index === completedCount) {
      status = "in_progress";
      const d = new Date();
      d.setDate(d.getDate() - 1);
      date = d.toISOString().split("T")[0];
      remarks = `Currently under review / active processing in this phase.`;
    }

    workflow[key] = {
      status,
      date: date || undefined,
      remarks,
      assignedExecutive,
    };
  });

  // Apply overrides
  Object.entries(customOverrides).forEach(([key, override]) => {
    if (workflow[key as WorkflowStageKey]) {
      workflow[key as WorkflowStageKey] = {
        ...workflow[key as WorkflowStageKey],
        ...override as any
      };
    }
  });

  return workflow;
};

// Calculate progress percentage
export const calculateProgress = (workflow: Record<WorkflowStageKey, StageProgress>): number => {
  const keys = Object.keys(workflow) as WorkflowStageKey[];
  let completed = 0;
  let partial = 0;

  keys.forEach((key) => {
    if (workflow[key].status === "completed") {
      completed++;
    } else if (workflow[key].status === "in_progress") {
      partial += 0.5;
    }
  });

  return Math.round(((completed + partial) / keys.length) * 100);
};

export const MOCK_SEWADARS: SewadarProfile[] = [
  {
    id: "sew-001",
    name: "Gurpreet Singh",
    badgeNumber: "SEW-2026-081",
    tempNumber: "TEMP-2026-003",
    enrollmentType: "New",
    contactNumber: "+91 98765 43210",
    emergencyContact: "+91 98765 43001",
    gender: "Male",
    dob: "1988-04-12",
    address: "House 24B, Ranjit Avenue",
    location: "Main Darbar Sahib, Amritsar",
    photographUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    status: "Completed",
    progress: 100,
    createdDate: "2026-02-10",
    area: "Amritsar Sector-A",
    sewaType: "Kitchen (Langar)",
    workflow: createInitialWorkflow(11),
    documents: [
      { id: "doc-1", name: "Aadhaar Card", type: "pdf", url: "#", size: "1.2 MB", uploadDate: "2026-02-12", version: 1 },
      { id: "doc-2", name: "ID Proof (Voter Card)", type: "pdf", url: "#", size: "850 KB", uploadDate: "2026-02-12", version: 1 },
      { id: "doc-3", name: "Medical Fitness Certificate", type: "pdf", url: "#", size: "2.4 MB", uploadDate: "2026-02-18", version: 1 }
    ]
  },
  {
    id: "sew-002",
    name: "Amardeep Kaur",
    badgeNumber: "",
    tempNumber: "TEMP-2026-042",
    enrollmentType: "New",
    contactNumber: "+91 94452 11094",
    emergencyContact: "+91 91223 44556",
    gender: "Female",
    dob: "1994-08-25",
    address: "Block C-4, Sector 15",
    location: "Sewa Samiti Office, Delhi",
    photographUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    status: "Active",
    progress: 73,
    createdDate: "2026-05-18", // Created ~18 days ago (Warning State)
    area: "Delhi Central Area-B",
    sewaType: "Security",
    workflow: createInitialWorkflow(8, {
      medical: { status: "in_progress", remarks: "Medical report received from Apollo Labs, awaiting HOD signature review." },
      document_verification: { status: "completed", date: "2026-05-30", remarks: "All academic & identity records verified." }
    }),
    documents: [
      { id: "doc-4", name: "Aadhaar Card", type: "pdf", url: "#", size: "1.1 MB", uploadDate: "2026-05-18", version: 1 },
      { id: "doc-5", name: "Cyber Verification Receipt", type: "pdf", url: "#", size: "640 KB", uploadDate: "2026-05-24", version: 1 }
    ]
  },
  {
    id: "sew-003",
    name: "Kuldeep Singh Chawla",
    badgeNumber: "",
    tempNumber: "TEMP-2026-015",
    enrollmentType: "Revival",
    contactNumber: "+91 88776 55443",
    emergencyContact: "+91 98881 22210",
    gender: "Male",
    dob: "1975-12-05",
    address: "Flat 401, Golden Heights, Sector 34",
    location: "Sector 34 Gurudwara, Chandigarh",
    photographUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    status: "Hold",
    progress: 36,
    createdDate: "2026-04-10", // Created ~56 days ago (Critical State & Pending in Verification)
    area: "Chandigarh Block-C",
    sewaType: "Administrative",
    workflow: createInitialWorkflow(4, {
      verification: { status: "failed", date: "2026-04-20", remarks: "Verification on hold pending clarification about address history in Ludhiana. Ground check requested again." },
      temporary_number: { status: "pending", remarks: "Awaiting ground verification completion." }
    }),
    documents: [
      { id: "doc-6", name: "Aadhaar Card", type: "pdf", url: "#", size: "1.3 MB", uploadDate: "2026-04-10", version: 1 },
      { id: "doc-7", name: "Self Declaration Form", type: "pdf", url: "#", size: "450 KB", uploadDate: "2026-04-10", version: 1 }
    ]
  },
  {
    id: "sew-004",
    name: "Arjan Dev",
    badgeNumber: "",
    tempNumber: "TEMP-2026-092",
    enrollmentType: "Transfer",
    contactNumber: "+91 92211 44556",
    emergencyContact: "+91 99988 77766",
    gender: "Male",
    dob: "1991-02-14",
    address: "Row House 12, Guru Colony",
    location: "Sewa Center, Mumbai",
    photographUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    status: "Active",
    progress: 50,
    createdDate: "2026-05-28", // Created ~8 days ago (Normal state)
    area: "Mumbai Suburban-D",
    sewaType: "Kitchen (Langar)",
    workflow: createInitialWorkflow(5, {
      probation: { status: "in_progress", remarks: "Active 30-day probation commenced. Weekly review standard logs look excellent." },
    }),
    documents: [
      { id: "doc-8", name: "Aadhaar Card", type: "png", url: "#", size: "2.1 MB", uploadDate: "2026-05-28", version: 1 },
      { id: "doc-9", name: "Transfer Recommendation Letter", type: "pdf", url: "#", size: "750 KB", uploadDate: "2026-05-28", version: 2 }
    ]
  },
  {
    id: "sew-005",
    name: "Navjot Kaur",
    badgeNumber: "",
    tempNumber: "TEMP-2026-103",
    enrollmentType: "New",
    contactNumber: "+91 95532 99002",
    emergencyContact: "+91 93321 00994",
    gender: "Female",
    dob: "1997-11-30",
    address: "Street 5, Model Town",
    location: "Jalandhar Cantonment Campus",
    photographUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    status: "Active",
    progress: 18,
    createdDate: "2026-06-01", // Created ~4 days ago (Normal state)
    area: "Jalandhar Cantonment",
    sewaType: "Cleaning",
    workflow: createInitialWorkflow(2, {
      meeting_hod: { status: "in_progress", remarks: "Scheduled meeting set for Saturday 11 AM with HOD." }
    }),
    documents: [
      { id: "doc-10", name: "Aadhaar Card", type: "pdf", url: "#", size: "1.0 MB", uploadDate: "2026-06-01", version: 1 }
    ]
  },
  {
    id: "sew-006",
    name: "Rajesh Kumar Sharma",
    badgeNumber: "SEW-2026-054",
    tempNumber: "TEMP-2026-011",
    enrollmentType: "Transfer",
    contactNumber: "+91 98112 33445",
    emergencyContact: "+91 91122 33445",
    gender: "Male",
    dob: "1982-10-10",
    address: "C-25, Salt Lake Block F",
    location: "Kolkata Civic Center",
    photographUrl: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150",
    status: "Completed",
    progress: 100,
    createdDate: "2026-01-20",
    area: "Kolkata Civic Centre",
    sewaType: "Medical",
    workflow: createInitialWorkflow(11),
    documents: [
      { id: "doc-11", name: "Aadhaar Card", type: "pdf", url: "#", size: "1.1 MB", uploadDate: "2026-01-22", version: 1 },
      { id: "doc-12", name: "Medical Fit Proof", type: "pdf", url: "#", size: "1.6 MB", uploadDate: "2026-02-02", version: 1 }
    ]
  },
  {
    id: "sew-007",
    name: "Priya Patel",
    badgeNumber: "",
    tempNumber: "TEMP-2026-102",
    enrollmentType: "New",
    contactNumber: "+91 74455 66778",
    emergencyContact: "+91 71122 33445",
    gender: "Female",
    dob: "1999-01-15",
    address: "Apartment 902, Lotus Tower",
    location: "Sewa Center, Mumbai",
    photographUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    status: "Active",
    progress: 91,
    createdDate: "2026-05-15", // Created ~21 days ago (Warning State)
    area: "Mumbai Suburban-D",
    sewaType: "Security",
    workflow: createInitialWorkflow(10, {
      sewa_badge: { status: "in_progress", remarks: "Badge engraving order dispatched. Final approval complete." }
    }),
    documents: [
      { id: "doc-13", name: "Aadhaar Card", type: "pdf", url: "#", size: "1.4 MB", uploadDate: "2026-05-15", version: 1 },
      { id: "doc-14", name: "Medical Board Approval", type: "pdf", url: "#", size: "2.1 MB", uploadDate: "2026-05-24", version: 1 }
    ]
  },
  {
    id: "sew-008",
    name: "Suhail Khan",
    badgeNumber: "",
    tempNumber: "TEMP-2026-009",
    enrollmentType: "New",
    contactNumber: "+91 88990 11223",
    emergencyContact: "+91 99881 22334",
    gender: "Male",
    dob: "1994-06-18",
    address: "Lane 4, Jamia Enclave",
    location: "Sewa Samiti Office, Delhi",
    photographUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150",
    status: "Rejected",
    progress: 27,
    createdDate: "2026-03-01", // Critical Case - Stuck & Rejected
    area: "Delhi Central Area-B",
    sewaType: "Prashad Distribution",
    workflow: createInitialWorkflow(3, {
      verification: { status: "failed", remarks: "Discrepancy in address reference document. Applicant declined to submit corrected records." }
    }),
    documents: [
      { id: "doc-15", name: "Aadhaar Card", type: "pdf", url: "#", size: "910 KB", uploadDate: "2026-03-01", version: 1 }
    ]
  }
];

// Seed Attendance historical data (for past 5 days)
export const MOCK_ATTENDANCE: AttendanceRecord[] = [];

// Helper to fill attendance for past 5 days
const statuses: ("Present" | "Absent" | "HalfDay" | "Leave")[] = ["Present", "Present", "Present", "Present", "HalfDay", "Leave", "Absent"];
const times = ["08:15 AM", "08:30 AM", "08:45 AM", "09:00 AM"];
const outTimes = ["04:30 PM", "04:45 PM", "05:00 PM", "05:15 PM"];

const seedAttendance = () => {
  const dates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }

  let idx = 1;
  dates.forEach((date) => {
    MOCK_SEWADARS.forEach((s) => {
      // Completed or Active are primarily marked present, holds/rejected absent
      let status: "Present" | "Absent" | "HalfDay" | "Leave" = "Present";
      if (s.status === "Hold") {
        status = "Leave";
      } else if (s.status === "Rejected") {
        status = "Absent";
      } else {
        // Randomize standard Active / Completed to look organic
        status = statuses[(s.name.charCodeAt(0) + date.charCodeAt(9)) % statuses.length];
      }

      const hasTimes = status === "Present" || status === "HalfDay";
      const checkInTime = hasTimes ? times[(s.name.charCodeAt(1) + date.charCodeAt(8)) % times.length] : undefined;
      const checkOutTime = hasTimes ? outTimes[(s.name.charCodeAt(2) + date.charCodeAt(7)) % outTimes.length] : undefined;

      MOCK_ATTENDANCE.push({
        id: `att-${idx++}`,
        sewadarId: s.id,
        date,
        status,
        checkInTime,
        checkOutTime,
        method: s.id === "sew-001" && idx % 3 === 0 ? "QR Scanner" : "Manual"
      });
    });
  });
};

seedAttendance();

export const MOCK_NOTIFICATIONS: NotificationLog[] = [
  {
    id: "not-001",
    sewadarId: "sew-002",
    sewadarName: "Amardeep Kaur",
    type: "WhatsApp",
    title: "Verification Pending Clarification",
    message: "Awaiting final medical clearance files from VIP Ward.",
    timestamp: "2026-06-04 11:30 AM",
    status: "Sent"
  },
  {
    id: "not-002",
    sewadarId: "sew-003",
    sewadarName: "Kuldeep Singh Chawla",
    type: "Email",
    title: "Verification Status Flagged",
    message: "Attention: Your cyber ground verification was flagged with Warning details.",
    timestamp: "2026-06-03 14:15 PM",
    status: "Sent"
  },
  {
    id: "not-003",
    sewadarId: "sew-001",
    sewadarName: "Gurpreet Singh",
    type: "SMS",
    title: "Sewa Badge Approved",
    message: "Congratulations, your Sewa Badge SEW-2026-081 is active and ready for dispatch.",
    timestamp: "2026-06-01 09:00 AM",
    status: "Sent"
  }
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: "aud-001",
    userEmail: "gargsujal6july@gmail.com",
    userRole: "super_admin",
    action: "Updated Workflow Stage",
    timestamp: "2026-06-05 02:22 AM",
    details: "Advanced Gurpreet Singh to 'Sewa Badge Issued' fully."
  },
  {
    id: "aud-002",
    userEmail: "gargsujal6july@gmail.com",
    userRole: "admin",
    action: "Uploaded Documents",
    timestamp: "2026-06-04 11:45 PM",
    details: "Uploaded Transfer Recommendation Letter for Arjan Dev."
  },
  {
    id: "aud-003",
    userEmail: "gargsujal6july@gmail.com",
    userRole: "executive",
    action: "Conducted Interview",
    timestamp: "2026-06-04 10:30 AM",
    details: "Completed initial registration interview for Priya Patel."
  }
];
