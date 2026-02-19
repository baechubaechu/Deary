import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";
import * as ai from "./ai.ts";

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

app.get("/make-server-dd0ac201/health", (c) => c.json({ status: "ok" }));

app.get("/make-server-dd0ac201/test-gemini", async (c) => {
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiKey)
    return c.json({ success: false, error: "GEMINI_API_KEY not configured" }, 400);
  try {
    const listResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    );
    const listData = await listResponse.json();
    const models = listData.models || [];
    const generateModels = models.filter((m: { supportedGenerationMethods?: string[] }) =>
      m.supportedGenerationMethods?.includes("generateContent")
    );
    return c.json({
      success: true,
      availableModels: generateModels.map((m: { name: string }) => m.name),
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get("/make-server-dd0ac201/diaries", async (c) => {
  try {
    const diaries = await kv.getByPrefix("diary:");
    return c.json({ diaries });
  } catch (error) {
    console.error("Error fetching diaries:", error);
    return c.json({ error: "Failed to fetch diaries" }, 500);
  }
});

app.post("/make-server-dd0ac201/diaries", async (c) => {
  try {
    const { diary } = await c.req.json();
    if (!diary?.id) return c.json({ error: "Invalid diary data" }, 400);
    await kv.set(`diary:${diary.id}`, diary);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving diary:", error);
    return c.json({ error: "Failed to save diary" }, 500);
  }
});

app.delete("/make-server-dd0ac201/diaries/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`diary:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting diary:", error);
    return c.json({ error: "Failed to delete diary" }, 500);
  }
});

app.post("/make-server-dd0ac201/analyze-answer", async (c) => {
  try {
    const { question, answer, allAnswers, language } = await c.req.json();
    if (!question || !answer) return c.json({ error: "Missing required fields" }, 400);
    const lang = language === "en" ? "en" : "ko";
    const result = await ai.analyzeAnswerForFollowup(
      question,
      answer,
      allAnswers || {},
      lang
    );
    return c.json(result);
  } catch (error) {
    console.error("Error analyzing answer:", error);
    return c.json({ error: "Failed to analyze answer" }, 500);
  }
});

app.post("/make-server-dd0ac201/generate-diary", async (c) => {
  try {
    const { answers, language } = await c.req.json();
    if (!answers) return c.json({ error: "Missing answers" }, 400);
    const lang = language === "en" ? "en" : "ko";
    const diaryContent = await ai.generateDiary(answers, lang);
    return c.json({ content: diaryContent });
  } catch (error) {
    console.error("Error generating diary:", error);
    return c.json({ error: `Failed to generate diary: ${(error as Error).message}` }, 500);
  }
});

app.post("/make-server-dd0ac201/review-answers", async (c) => {
  try {
    const { answers, language } = await c.req.json();
    if (!answers) return c.json({ error: "Missing answers" }, 400);
    const lang = language === "en" ? "en" : "ko";
    const result = await ai.reviewAnswersBeforeDiary(answers, lang);
    return c.json(result);
  } catch (error) {
    console.error("Error reviewing answers:", error);
    return c.json({ error: "Failed to review answers" }, 500);
  }
});

app.post("/make-server-dd0ac201/next-question", async (c) => {
  try {
    const { answers, userId, questionCount, language } = await c.req.json();
    let userProfile: Record<string, unknown> = {};
    if (userId) {
      const profileData = await kv.get(`user_profile:${userId}`);
      if (profileData) userProfile = JSON.parse(profileData);
    }
    const lang = language === "en" ? "en" : "ko";
    const result = await ai.generateNextQuestion(
      answers || {},
      userProfile,
      questionCount || 0,
      lang
    );
    return c.json(result);
  } catch (error) {
    console.error("Error generating next question:", error);
    return c.json({ error: "Failed to generate next question" }, 500);
  }
});

app.post("/make-server-dd0ac201/update-profile", async (c) => {
  try {
    const { userId, answers, language } = await c.req.json();
    if (!userId) return c.json({ error: "Missing userId" }, 400);
    let existingProfile: Record<string, unknown> = {};
    const profileData = await kv.get(`user_profile:${userId}`);
    if (profileData) existingProfile = JSON.parse(profileData);
    const lang = language === "en" ? "en" : "ko";
    const updatedProfile = await ai.extractUserProfile(
      answers || {},
      existingProfile,
      lang
    );
    await kv.set(`user_profile:${userId}`, JSON.stringify(updatedProfile));
    return c.json({ profile: updatedProfile });
  } catch (error) {
    console.error("Error updating profile:", error);
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

app.get("/make-server-dd0ac201/get-profile/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    if (!userId) return c.json({ error: "Missing userId" }, 400);
    const profileData = await kv.get(`user_profile:${userId}`);
    const profile = profileData ? JSON.parse(profileData) : null;
    return c.json({ profile });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return c.json({ error: "Failed to fetch profile" }, 500);
  }
});

Deno.serve(app.fetch);
