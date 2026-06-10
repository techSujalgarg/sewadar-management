/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middlewares
app.use(express.json({ limit: "50mb" }));

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
