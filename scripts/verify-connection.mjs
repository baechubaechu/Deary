#!/usr/bin/env node
/**
 * Supabase & Cloudflare 연동 확인 스크립트
 * 실행: node scripts/verify-connection.mjs
 */

import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

function loadEnv() {
  const envPath = join(rootDir, ".env.local");
  if (!existsSync(envPath)) {
    console.error("❌ .env.local 파일이 없습니다.");
    process.exit(1);
  }
  const content = readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      val = val.replace(/^["']|["']$/g, "");
      env[key] = val;
    }
  }
  return env;
}

async function main() {
  console.log("\n🔍 Deary 연동 상태 확인\n");
  console.log("━".repeat(50));

  const env = loadEnv();
  const projectId = env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!projectId || !anonKey) {
    console.error("❌ .env.local에 VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_ANON_KEY가 필요합니다.");
    process.exit(1);
  }
  if (projectId.includes("여기에") || anonKey.includes("여기에")) {
    console.error("❌ .env.local에 실제 Supabase 값을 입력해주세요. (.env.example 참고)");
    process.exit(1);
  }

  const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-dd0ac201`;

  // 1. Diaries (GET)
  console.log("\n📚 Diaries API (GET)...");
  try {
    const res = await fetch(`${baseUrl}/diaries`, {
      headers: { Authorization: `Bearer ${anonKey}` },
    });
    if (res.ok) {
      const data = await res.json();
      const count = data.diaries?.length ?? 0;
      console.log(`   ✅ 성공 (저장된 일기: ${count}개)`);
    } else {
      console.log("   ❌ 실패:", res.status, await res.text());
    }
  } catch (e) {
    console.log("   ❌ 오류:", e.message);
  }

  // 2. Test Gemini (AI 연결)
  console.log("\n🤖 Gemini API 연결 (test-gemini)...");
  try {
    const res = await fetch(`${baseUrl}/test-gemini`, {
      headers: { Authorization: `Bearer ${anonKey}` },
    });
    const data = await res.json();
    if (data.success) {
      console.log("   ✅ Gemini API 연결 성공");
    } else {
      console.log("   ⚠️ Gemini:", data.error || "확인 필요");
    }
  } catch (e) {
    console.log("   ❌ 오류:", e.message);
  }

  // 4. Cloudflare 안내
  console.log("\n━".repeat(50));
  console.log("\n☁️ Cloudflare Pages 확인:");
  console.log("   1. Cloudflare Dashboard → Pages → 프로젝트 선택");
  console.log("   2. 배포된 URL 접속 후 앱 동작 확인");
  console.log("   3. Settings → Environment variables에 다음 설정 확인:");
  console.log("      - VITE_SUPABASE_PROJECT_ID");
  console.log("      - VITE_SUPABASE_ANON_KEY");
  console.log("\n");
}

main().catch(console.error);
