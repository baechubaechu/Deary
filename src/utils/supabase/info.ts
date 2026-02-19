/** Supabase 설정 - .env.local 또는 Cloudflare 환경 변수에서 읽음 */
export const projectId =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "";
export const publicAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
