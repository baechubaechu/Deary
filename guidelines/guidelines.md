# Deary 프로젝트 가이드라인

## 일반 코드 가이드

- **레이아웃**: 가능하면 `flex`, `grid`, `gap`을 사용하고, 꼭 필요할 때만 absolute/fixed 사용.
- **스타일링**: 순수 CSS 대신 **Tailwind CSS 유틸 클래스**와 `index.css`에 정의된 토큰(`bg-background`, `text-foreground`, `border-border` 등)을 우선 사용.
- **상태 관리**: 간단한 경우에는 로컬 `useState`/`useEffect`를 쓰고, 전역 상태가 필요할 때까지 별도 상태 라이브러리는 도입하지 않음.
- **비즈니스 로직**: API 호출, 데이터 가공 등은 가능하면 `components` 바깥의 유틸/훅으로 분리.
- **보안**: Supabase, Gemini 등 모든 민감 값은 `.env.local` 또는 배포 환경 변수에 두고, 코드/리포지토리에 직접 쓰지 않음.

## 디자인 시스템 / UI 가이드

- **기본 테마**
  - `index.css`의 CSS 변수/`@theme inline`을 기준으로 색, radius, 타이포를 맞춘다.
  - 배경은 `bg-background`, 텍스트는 `text-foreground`, 카드 영역은 `bg-card` + `border-border` 조합을 선호.
- **타이포그래피**
  - 제목은 Tailwind `text-2xl`, `text-xl`, `text-lg`에 의존하되, 기본 값은 `index.css`의 base 스타일을 따른다.
  - 버튼/레이블은 명확한 행동/의미가 드러나도록 한글 동사형으로 작성 (예: “일기 생성”, “다시 쓰기”).
- **컴포넌트**
  - 버튼: `rounded-xl`, `px-4 py-2`, `font-medium`, 상태에 따른 `hover`, `disabled` 스타일을 항상 포함.
  - 카드: `rounded-2xl`, `shadow-sm`~`shadow-lg`, `border border-border`, 배경은 `bg-card` 또는 `bg-white/80`.
  - 리스트: hover 시 배경/보더 색만 살짝 변경해서 상태 변화를 표현 (`hover:bg-amber-50`, `hover:border-amber-200` 등).

## 일기 앱 UX 가이드

- **질문 흐름**
  - 기본 질문은 하루에 **5개**, 부족할 경우 AI 판단으로 **최대 7개까지** 확장.
  - 질문과 답변은 **채팅 버블** 형태로 좌우 정렬해서 “대화하는 느낌”을 유지.
  - 질문은 항상 “오늘 ~”을 명시해서 **오늘 하루에만 집중**.
- **일기 생성**
  - 일기 텍스트는 한글 `~했다`, `~였다` 톤의 평서형으로, 추상적인 표현을 피하고 사용자가 실제로 말한 정보만 사용.
  - 일기 저장 후에는 **왼쪽 리스트 즉시 갱신**, 오른쪽에는 최종 일기 카드 표시.
- **에러/로딩**
  - API 에러가 날 경우 상단 또는 입력창 위에 **짧고 명확한 한국어 메시지**를 띄운다.
  - 로딩 중에는 버튼 안에 `Loader2` 아이콘과 함께 “생각 중…” 같은 텍스트를 함께 보여준다.

## 접근성 & 국제화

- 모든 인터랙션 텍스트와 레이블은 **한국어**를 기본으로 작성.
- 버튼, 아이콘에는 `title` 또는 `aria-label`을 가능하면 함께 넣어 스크린리더 호환성을 높인다.

## 다국어 지원 (ko / en)

- **지원 언어**: 한국어(ko), 영어(en). `localStorage.deary_language`에 저장.
- **언어 전환**: 헤더의 "한국어 / EN" 또는 "KO / English" 버튼으로 전환 시 `window.location.reload()`로 새로고침.
- **번역 적용**: 모든 UI 문자열은 각 컴포넌트 내 `t.ko` / `t.en` 객체로 관리. `language` prop을 받아 `text = language === "en" ? t.en : t.ko`로 선택.
- **API 전달**: `next-question`, `analyze-answer`, `generate-diary`, `update-profile` 등 모든 API 호출에 `language` 파라미터를 포함.
- **날짜/로케일**: `toLocaleDateString(language === "en" ? "en-US" : "ko-KR", ...)`로 일기 날짜 포맷.
- **index.html**: 초기 로드 시 `localStorage.deary_language`를 읽어 `<html lang>`과 `document.title`을 설정. 저장값이 없으면 기본 "ko".

