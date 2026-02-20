import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.ts";
import * as ai from "./ai.ts";

const app = new Hono();
const P = "/make-server-dd0ac201";
// Supabase may pass /P/xxx or /xxx - register both
const both = (path: string) => [path, `${P}${path}`] as const;

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

for (const p of both("/health")) app.get(p, (c) => c.json({ status: "ok" }));

// 디버그: 실제 요청 경로 확인용 (배포 후 /debug 호출해보세요)
for (const p of ["/debug", `${P}/debug`])
  app.get(p, (c) => c.json({ path: new URL(c.req.url).pathname, url: c.req.url }));

for (const p of both("/test-gemini"))
  app.get(p, async (c) => {
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

const getDiaries = async (c: { req: { query: (k: string) => string }; json: (body: unknown, status?: number) => unknown }) => {
  try {
    const userId = c.req.query("userId");
    if (!userId) return c.json({ error: "Missing userId" }, 400);
    const diaries = await kv.getByPrefix(`diary:${userId}:`);
    return c.json({ diaries });
  } catch (error) {
    console.error("Error fetching diaries:", error);
    return c.json({ error: "Failed to fetch diaries" }, 500);
  }
};
for (const p of both("/diaries")) app.get(p, getDiaries);

// 구 형식(diary:123, diary:userId: 등) 일기를 현재 user.id로 복구
const recoverDiaries = async (c: { req: { query: (k: string) => string }; json: (body: unknown, status?: number) => unknown }) => {
  try {
    const userId = c.req.query("userId");
    if (!userId) return c.json({ error: "Missing userId" }, 400);
    const all = await kv.getByPrefixWithKeys("diary:");
    const myPrefix = `diary:${userId}:`;
    let migrated = 0;
    for (const { key, value } of all) {
      if (key.startsWith(myPrefix)) continue; // 이미 현재 사용자 소유
      const diary = value as { id?: string; date?: string; content?: string; answers?: unknown; timestamp?: number };
      if (!diary || typeof diary !== "object") continue;
      const diaryId = diary.id ?? key.replace(/^diary:/, "").split(":")[0] ?? key;
      const toSave = { ...diary, id: diaryId };
      await kv.set(`diary:${userId}:${diaryId}`, toSave);
      await kv.del(key);
      migrated++;
    }
    return c.json({ migrated, total: all.length });
  } catch (error) {
    console.error("Recover diaries error:", error);
    return c.json({ error: "Failed to recover diaries" }, 500);
  }
};
for (const p of both("/diaries-recover")) app.post(p, recoverDiaries);

const postDiaries = async (c: { req: { json: () => Promise<unknown> }; json: (body: unknown, status?: number) => unknown }) => {
  try {
    const { diary, userId } = (await c.req.json()) as { diary?: { id?: string }; userId?: string };
    if (!diary?.id) return c.json({ error: "Invalid diary data" }, 400);
    if (!userId) return c.json({ error: "Missing userId" }, 400);
    await kv.set(`diary:${userId}:${diary.id}`, diary);
    return c.json({ success: true });
  } catch (error) {
    console.error("Error saving diary:", error);
    return c.json({ error: "Failed to save diary" }, 500);
  }
};
for (const p of both("/diaries")) app.post(p, postDiaries);

for (const p of both("/diaries/:id"))
  app.delete(p, async (c) => {
    try {
      const id = c.req.param("id");
      const userId = c.req.query("userId");
      if (!userId) return c.json({ error: "Missing userId" }, 400);
      await kv.del(`diary:${userId}:${id}`);
      return c.json({ success: true });
    } catch (error) {
      console.error("Error deleting diary:", error);
      return c.json({ error: "Failed to delete diary" }, 500);
    }
  });

app.post(`${P}/analyze-answer`, async (c) => {
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

app.post(`${P}/generate-diary`, async (c) => {
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

app.post(`${P}/review-answers`, async (c) => {
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

app.post(`${P}/next-question`, async (c) => {
  try {
    const { answers, userId, questionCount, language, skippedQuestion, askedQuestions } = await c.req.json();
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
      lang,
      skippedQuestion || undefined,
      Array.isArray(askedQuestions) ? askedQuestions : []
    );
    return c.json(result);
  } catch (error) {
    console.error("Error generating next question:", error);
    return c.json({ error: "Failed to generate next question" }, 500);
  }
});

app.post(`${P}/update-profile`, async (c) => {
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

// Neural2 voices: female 1 + male 1 per language
const TTS_VOICES: Record<string, string[]> = {
  ko: ["ko-KR-Neural2-A", "ko-KR-Neural2-C"], // F, M
  en: ["en-US-Neural2-C", "en-US-Neural2-A"], // F, M
};
const TTS_DEFAULT: Record<string, string> = {
  ko: "ko-KR-Neural2-A",
  en: "en-US-Neural2-C",
};

app.post(`${P}/tts`, async (c) => {
  const apiKey = Deno.env.get("GOOGLE_TTS_API_KEY");
  if (!apiKey) {
    return c.json({ error: "GOOGLE_TTS_API_KEY not configured" }, 501);
  }
  try {
    const { text, language, voice: reqVoice } = await c.req.json();
    if (!text || typeof text !== "string") {
      return c.json({ error: "Missing text" }, 400);
    }
    const lang = language === "en" ? "en" : "ko";
    const langCode = lang === "en" ? "en-US" : "ko-KR";
    const allowed = TTS_VOICES[lang];
    const voiceName =
      typeof reqVoice === "string" && allowed.includes(reqVoice)
        ? reqVoice
        : TTS_DEFAULT[lang];
    const res = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: text.trim() },
          voice: {
            languageCode: langCode,
            name: voiceName,
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 0.95,
            pitch: 0,
          },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      console.error("Google TTS error:", res.status, err);
      return c.json({ error: `TTS failed: ${res.status}` }, 502);
    }
    const data = await res.json();
    const b64 = data.audioContent;
    if (!b64) {
      return c.json({ error: "No audio in response" }, 502);
    }
    const b64clean = b64.replace(/-/g, "+").replace(/_/g, "/");
    const binary = Uint8Array.from(atob(b64clean), (c) => c.charCodeAt(0));
    return new Response(binary, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(binary.length),
      },
    });
  } catch (error) {
    console.error("TTS error:", error);
    return c.json({ error: "TTS failed" }, 500);
  }
});

app.get(`${P}/get-profile/:userId`, async (c) => {
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
