import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ollama from "ollama";
import jwt from "jsonwebtoken";
import SupportLog from "../models/supportLog.model.js";
import Student from "../models/student.model.js";
import Court from "../models/court.model.js";
import Workshop from "../models/workshop.model.js";
import Trip from "../models/trip.model.js";
import GymSession from "../models/gymSession.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const faqPath = path.join(__dirname, "..", "support", "faq.json");

let faqEntries = [];
try {
  const raw = fs.readFileSync(faqPath, "utf-8");
  faqEntries = JSON.parse(raw);
} catch (err) {
  console.error("Failed to load support FAQ:", err?.message);
}

const SYSTEM_PROMPT = `You are the Beit Gedy campus support assistant.
- Answer in 1-3 short sentences, factual and to the point.
- Only use details from provided context/FAQ. If unsure, say you don't know and ask for a specific detail.
- Never invent policies, times, prices, or names. No secrets, passwords, or admin instructions.
- Scope is campus services: events, courts, gym, payments, vendors, loyalty, notifications.
- For sensitive actions (refunds, cancellations), explain the required steps; do not claim you performed them.
- Maintain a polite, professional, and helpful tone.
- Be concise and factual.
- If you don't know, ask clarifying questions rather than inventing details.
- Never expose secrets, passwords, or admin-only instructions.
- Keep answers within campus services: events, courts, gym, payments, vendors, loyalty, notifications.
- If the request involves sensitive actions (refunds, cancellations), instruct the user on the proper steps and required info; do not pretend to perform them.
`;

function matchFaq(message = "") {
  const lower = message.toLowerCase();
  return faqEntries.find((item) =>
    (item.keywords || []).some((kw) => lower.includes(kw.toLowerCase()))
  );
}

async function buildUserContext(user) {
  if (!user?.id) return "";

  // Start with basic identity for the model prompt; avoid PII like email.
  let context = `User role: ${user.role || "unknown"}. `;

  try {
    if (user.role === "Student") {
      const student = await Student.findById(user.id).select(
        "firstName lastName UniId"
      );
      if (student) {
        const name = `${student.firstName || ""} ${student.lastName || ""}`.trim();
        context += `Student name: ${name || "N/A"}, UniId: ${student.UniId || "N/A"}. `;

        // Fetch recent court reservations for quick reference (last 3).
        const reservations = await Court.find({
          studentId: student._id,
        })
          .sort({ date: -1, time: -1 })
          .limit(3)
          .lean();

        if (reservations.length) {
          const summary = reservations
            .map((r) => `${r.court} on ${new Date(r.date).toDateString()} ${r.time || ""}`.trim())
            .join("; ");
          context += `Recent court reservations: ${summary}. `;
        }
      }
    }

    // Upcoming registrations across events/gym (up to 2 per type)
    const now = new Date();

    const [workshops, trips, gymSessions] = await Promise.all([
      Workshop.find({
        "registrants.user": user.id,
        startDate: { $gte: now },
        archived: { $ne: true },
      })
        .sort({ startDate: 1 })
        .limit(2)
        .select("name startDate startTime")
        .lean(),
      Trip.find({
        "registrants.user": user.id,
        startDate: { $gte: now },
        archived: { $ne: true },
      })
        .sort({ startDate: 1 })
        .limit(2)
        .select("name startDate startTime")
        .lean(),
      GymSession.find({
        "registrants.user": user.id,
        date: { $gte: now },
      })
        .sort({ date: 1 })
        .limit(2)
        .select("date time type")
        .lean(),
    ]);

    if (workshops?.length) {
      const summary = workshops
        .map(
          (w) =>
            `${w.name} on ${new Date(w.startDate).toDateString()} ${w.startTime || ""}`.trim()
        )
        .join("; ");
      context += `Upcoming workshops: ${summary}. `;
    }

    if (trips?.length) {
      const summary = trips
        .map(
          (t) =>
            `${t.name} on ${new Date(t.startDate).toDateString()} ${t.startTime || ""}`.trim()
        )
        .join("; ");
      context += `Upcoming trips: ${summary}. `;
    }

    if (gymSessions?.length) {
      const summary = gymSessions
        .map(
          (g) =>
            `${g.type || "Gym"} on ${new Date(g.date).toDateString()} ${g.time || ""}`.trim()
        )
        .join("; ");
      context += `Upcoming gym sessions: ${summary}. `;
    }
  } catch (err) {
    console.error("Support context fetch error:", err?.message);
  }

  return context.trim();
}

export async function chatWithSupport(req, res) {
  const { message } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "Please provide a message string." });
  }

  const user = req.user || null;
  const matchedFaq = matchFaq(message);

  // FAQ shortcut
  if (matchedFaq) {
    const answer = matchedFaq.answer;
    await SupportLog.create({
      userId: user?.id || null,
      role: user?.role || "guest",
      question: message,
      answer,
      resolvedBy: "faq",
    }).catch((err) => console.error("SupportLog FAQ save failed:", err?.message));

    return res.json({ answer, resolvedBy: "faq" });
  }

  try {
    const userContext = await buildUserContext(user);
    const model = process.env.OLLAMA_MODEL || "llama3.1:8b";

    const response = await ollama.chat({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        userContext
          ? { role: "system", content: `Context: ${userContext}` }
          : null,
        { role: "user", content: message },
      ].filter(Boolean),
      options: {
        num_predict: 256,
        temperature: 0.3,
      },
    });

    const answer =
      response?.message?.content?.trim() || "Sorry, I could not generate a response.";

    await SupportLog.create({
      userId: user?.id || null,
      role: user?.role || "guest",
      question: message,
      answer,
      resolvedBy: "llm",
      modelUsed: model,
    }).catch((err) => console.error("SupportLog LLM save failed:", err?.message));

    return res.json({ answer, resolvedBy: "llm" });
  } catch (error) {
    console.error("Support chat error:", error?.message);
    return res.status(500).json({ message: "Support service unavailable." });
  }
}

export function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next();

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    console.error("Optional auth failed:", err?.message);
  }
  next();
}
