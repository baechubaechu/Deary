# 배포 가이드

## Supabase Edge Function 자동 배포

`supabase/functions/` 폴더의 코드를 수정하고 **main 브랜치에 push**하면 GitHub Actions가 자동으로 Supabase에 배포합니다.

### 1. GitHub Secrets 설정

GitHub 저장소 → **Settings** → **Secrets and variables** → **Actions**에서 다음 시크릿을 추가하세요:

| 시크릿 이름 | 설명 | 얻는 방법 |
|------------|------|----------|
| `SUPABASE_ACCESS_TOKEN` | Supabase API 토큰 | [Supabase Dashboard](https://supabase.com/dashboard/account/tokens) → Access Tokens → Generate new token |
| `SUPABASE_PROJECT_REF` | 프로젝트 ID | Supabase Dashboard URL의 `https://supabase.com/dashboard/project/`**여기** 부분. `.env.local`의 `VITE_SUPABASE_PROJECT_ID`와 동일 |

### 2. 배포 트리거

- **자동**: `supabase/functions/**` 파일 변경 후 `main`에 push
- **수동**: GitHub → Actions → "Deploy Supabase Edge Functions" → Run workflow

### 3. 배포 확인

GitHub Actions 탭에서 워크플로 실행 결과를 확인할 수 있습니다.
