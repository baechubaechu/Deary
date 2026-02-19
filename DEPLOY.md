# 배포 가이드

## Supabase Auth (로그인) 설정

1. **Supabase Dashboard** → **Authentication** → **Providers**
2. **Email** 활성화 확인 (기본 활성화)
3. **Email Templates** (선택): 이메일 확인, 비밀번호 재설정 등 커스터마이즈 가능

회원가입 시 Supabase가 `auth.users` 테이블에 사용자 정보를 저장합니다.

## TTS (음성 읽기) - Google Cloud (선택)

Web TTS 대신 더 자연스러운 음성을 위해 **Google Cloud Text-to-Speech API**를 사용할 수 있습니다.

### 1. Google Cloud 설정

1. [Google Cloud Console](https://console.cloud.google.com/) → 프로젝트 선택
2. **API 및 서비스** → **라이브러리** → "Cloud Text-to-Speech API" 검색 → **사용**
3. **API 및 서비스** → **사용자 인증 정보** → **사용자 인증 정보 만들기** → **API 키**
4. API 키 생성 후, **제한사항**에서 "Cloud Text-to-Speech API"만 허용하도록 설정 (권장)

### 2. Supabase Secrets

**Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**

- `GOOGLE_TTS_API_KEY`: 위에서 생성한 API 키

### 3. 무료 한도

- Neural2 음성: 월 100만 자 무료
- 신규 가입 시 $300 크레딧

설정 시 Google Cloud TTS 사용, 미설정 시 브라우저 기본 Web TTS로 자동 폴백됩니다.

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
