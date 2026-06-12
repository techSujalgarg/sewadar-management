/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middlewares
app.use(express.json({ limit: "50mb" }));

// PRODUCTION-READY USER PERSISTENCE SYSTEM
const DB_PATH = path.join(process.cwd(), "users_registry.json");

const DEFAULT_USERS = [
  {
    id: "user-admin",
    name: "Sujal Garg",
    email: "admin@sms.org",
    role: "Super Admin",
    isActive: true,
    lastLogin: "2026-06-09 15:49:06",
    password: "admin123",
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
    password: "lead123",
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
    password: "view123",
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
      workflow: true,
      reports: false,
      userManagement: false
    }
  }
];

function loadUsers() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to read user registry file, using defaults:", err);
  }
  return DEFAULT_USERS;
}

function saveUsers(users: any[]) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to user registry file:", err);
  }
}

// 1. GET /api/users - Retrieve user accounts registry
app.get("/api/users", (req, res) => {
  const users = loadUsers();
  // Strip passwords in production output for security
  const safeUsers = users.map(({ password, ...u }: any) => u);
  res.json(safeUsers);
});

// 2. POST /api/users - Create custom dynamic user account
app.post("/api/users", (req, res) => {
  const newUser = req.body;
  if (!newUser || !newUser.name || !newUser.email) {
    return res.status(400).json({ error: "Name and email are required" });
  }
  const users = loadUsers();
  if (users.some((u: any) => u.email.toLowerCase() === newUser.email.toLowerCase())) {
    return res.status(400).json({ error: "User Account with this email already exists" });
  }

  const completeUser = {
    ...newUser,
    id: newUser.id || `usr-${Date.now()}`,
    lastLogin: "Never Logged",
    password: newUser.password || "user123"
  };

  users.push(completeUser);
  saveUsers(users);

  const { password, ...safeUser } = completeUser;
  res.status(201).json(safeUser);
});

// 3. PUT /api/users/:id - Update user properties (e.g. password resets, privilege toggles)
app.put("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const users = loadUsers();
  const idx = users.findIndex((u: any) => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "User profile not found" });
  }

  users[idx] = {
    ...users[idx],
    ...updates
  };
  saveUsers(users);

  const { password, ...safeUser } = users[idx];
  res.json(safeUser);
});

// 4. DELETE /api/users/:id - Erase user access
app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const users = loadUsers();
  const filtered = users.filter((u: any) => u.id !== id);
  if (filtered.length === users.length) {
    return res.status(404).json({ error: "User profile not found" });
  }
  saveUsers(filtered);
  res.json({ success: true, id });
});

// 5. POST /api/auth/login - Secure server-side credential verification
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const users = loadUsers();
  const matched = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (!matched) {
    return res.status(401).json({ error: "Invalid credentials or account deactivated. Contact Super Admin." });
  }

  if (!matched.isActive) {
    return res.status(401).json({ error: "Account deactivated. Contact Super Admin." });
  }

  const expectedPassword = matched.password || "user123";
  if (password !== expectedPassword) {
    return res.status(401).json({ error: "Invalid credentials. Contact Super Admin." });
  }

  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19);
  matched.lastLogin = timestamp;
  saveUsers(users);

  const { password: _, ...safeUser } = matched;
  res.json({ success: true, user: safeUser });
});

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
  }
}

// 1. API: AI Dashboard Assistant
app.post("/api/ai-assistant", async (req, res) => {
  const { prompt, sewadars, attendance, currentRole } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "No prompt provided" });
  }

  if (!ai) {
    // Elegant fallback guidance if GEMINI_API_KEY is not configured
    return res.json({
      text: `### Google Gemini API is not configured.
Your API Key can be configured in the **Settings > Secrets** panel.

Here's an analysis based on local heuristics:
* **Prompt received:** "${prompt}"
* **Current database stats:** ${sewadars?.length || 0} Sewadars found.
* **Role:** ${currentRole || "Guest"}

To enable fully dynamic, intelligent AI insights, please supply a valid \`GEMINI_API_KEY\`!`,
    });
  }

  try {
    // Construct rich historical perspective context
    const dbContext = JSON.stringify({
      sewadars: sewadars?.map((s: any) => ({
        id: s.id,
        name: s.name,
        badgeNumber: s.badgeNumber,
        tempNumber: s.tempNumber,
        enrollmentType: s.enrollmentType,
        location: s.location,
        status: s.status,
        progress: s.progress,
        createdDate: s.createdDate,
        workflow: Object.entries(s.workflow).reduce((acc: any, [key, val]: any) => {
          acc[key] = val.status;
          return acc;
        }, {}),
      })),
      attendanceStats: {
        totalAttendanceRecords: attendance?.length || 0,
        averageAttendanceRatePercent: attendance?.length 
          ? Math.round(
              (attendance.filter((a: any) => a.status === "Present" || a.status === "HalfDay").length /
                attendance.length) * 100
            )
          : 0,
      },
      currentRole,
    });

    const systemInstruction = `You are the Sewadar Management System AI Assistant (acting as a helpful Zoho CRM & Monday.com and Power BI analyst combined).
You are working with role-based access: ${currentRole || "executive"}.
You have access to the complete current database state provided in the context below. 

Database State Context:
${dbContext}

Rules and Actions:
1. Always analyze this actual data. Avoid generic text. Point specifically to names, badge numbers, locations, or dates.
2. If the user asks for "pending verification", list the candidates whose 'verification' workflow status is NOT 'completed' and specify their name/location.
3. If asked about "stuck in probation" or "critical cases", find sewadars with more than 30 days pending (createdDate is older than 30 days relative to current time 2026-06-05) and progress not near 100%, or those who have had a failed step.
4. If asked about "top performers", analyze the progress counts or attendance presence.
5. If asked to "predict completion date", estimate based on average progress versus days since created. (Average 1 stage per 3-5 days is standard).
6. Give responses in a highly professional, polite markdown format with tables or lists. No self-praise. Do not reveal raw JSON or internal variable names. Use elegant, clean spacing. Provide actual insights!`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2, // Keep it focused and precise
      },
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: "Failed to query Gemini API", details: err.message });
  }
});

// Serve static assets & initialize Vite/Vite-middleware
const startExpress = async () => {
  if (process.env.NODE_ENV !== "production") {
    // Integration of Vite as dev middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static folder serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express full-stack server running on http://localhost:${PORT}`);
  });
};

startExpress();
