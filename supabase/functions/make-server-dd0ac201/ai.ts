const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export type Language = "ko" | "en";

function getLang(lang?: string): Language {
  return lang === "en" ? "en" : "ko";
}

/**
 * Deary 질문 테마 & 풀 - '다정한 에디터' 톤
 * 말투: ~했군요, ~했는지 궁금해요, ~드셨어요? (청유형)
 * 적당한 거리감, 지적인 호기심, 구체적인 질문
 */
const QUESTION_POOLS = {
  ko: {
    theme1_morning: [
      "오늘 아침에 제일 먼저 하신 게 뭐예요? 물 마시기? 아니면 핸드폰 확인?",
      "오늘 아침 출근(등교) 길에 평소와 다르게 눈에 띈 풍경이 있었는지 궁금해요.",
      "집을 나설 때 공기가 어땠나요? 춥진 않았어요, 아니면 좀 더웠나요?",
      "오늘 하루를 시작하면서 다짐하신 게 있나요?",
      "오늘 아침 눈 뜨셨을 때 개운했나요, 아니면 더 자고 싶었나요?",
    ],
    theme2_highlight: [
      "오늘 하루를 사진 한 장으로 남긴다면, 어떤 순간을 찍고 싶으세요?",
      "오늘 가장 크게 웃었던 순간이 언제였는지 궁금해요. 뭐 때문에 그렇게 웃으셨어요?",
      "예상치 못하게 당황스럽거나 놀라셨던 일이 있었나요?",
      "오늘 들으신 노래나 영상 중에 기억에 남는 게 있나요?",
      "오늘 스스로를 칭찬해주고 싶은 순간이 있다면 언제였나요?",
    ],
    theme3_food: [
      "오늘 점심은 뭐 드셨어요? 맛있는 거 드셨으면 좋겠는데.",
      "누구랑 같이 드셨어요? 밥 먹으면서 무슨 얘기 나누셨는지 궁금해요.",
      "오늘 커피나 차 마셨나요? 카페 분위기는 어땠나요?",
      "오늘 배고픈데 참으신 적 있나요, 아니면 너무 배부르게 드셨나요?",
      "오늘 드신 음식 중에 '이건 또 먹고 싶다' 싶은 게 있었나요?",
    ],
    theme4_work: [
      "오늘 해야 했던 일(과제)들은 계획대로 잘 끝내셨나요? 아니면 좀 미뤄지셨나요?",
      "일하시다가(공부하시다가) 제일 답답하거나 막히셨던 순간이 언제였는지 궁금해요.",
      "오늘 회의나 수업 시간에 기억에 남는 내용이나 발언이 있었나요?",
      "오늘 에너지를 가장 많이 쓴 일이 뭐였나요?",
      "집에 돌아오는 길에 일 생각은 잊으셨나요, 아니면 계속 떠오르셨나요?",
    ],
    theme5_relationships: [
      "오늘 가장 말을 많이 나누신 분이 누구였나요?",
      "오늘 누군가와 대화하시다가 인상 깊었던 문장이 있나요?",
      "오늘 연락하고 싶었는데 못 하신 분이 있나요?",
      "오늘 만나신 분들 중에 표정이 기억나는 얼굴이 있나요?",
      "오늘 인간관계 때문에 조금이라도 신경 쓰이거나 속상한 일은 없었나요?",
    ],
  },
  en: {
    theme1_morning: [
      "What was the very first thing you did this morning? Had some water, or checked your phone?",
      "I'm curious—on your way to work or school this morning, did you notice anything different from usual?",
      "How was the air when you left the house? A bit cold, or rather warm?",
      "Did you make any resolutions when you started your day today?",
      "When you woke up, did you feel refreshed, or like you could've slept more?",
    ],
    theme2_highlight: [
      "If you could capture today in one photo, what moment would you take? I'm curious.",
      "When did you laugh the hardest today? I'd love to hear what made you laugh like that.",
      "Was there anything that caught you off guard or surprised you today?",
      "Any song or video you heard or watched today that stuck with you?",
      "If there's a moment today you'd want to pat yourself on the back for, when was it?",
    ],
    theme3_food: [
      "What did you have for lunch today? I hope it was something good.",
      "Who did you eat with? I'm curious what you talked about over the meal.",
      "Did you have coffee or tea today? How was the café vibe?",
      "Did you skip a meal when you were hungry, or eat a bit too much today?",
      "Was there anything you ate today that you'd want to have again?",
    ],
    theme4_work: [
      "Did you finish what you had to do (or homework) as planned today, or did you put some things off?",
      "I'm curious—when was the most frustrating or stuck moment at work or studying today?",
      "Was there anything memorable said in a meeting or class today?",
      "What task used up most of your energy today?",
      "On your way home, did you leave work behind, or did it keep running through your mind?",
    ],
    theme5_relationships: [
      "Who did you talk to the most today?",
      "Was there a sentence from a conversation today that stuck with you?",
      "Was there anyone you wanted to reach out to but couldn't today?",
      "Do you remember any particular face or expression from someone you met today?",
      "Was there anything that bothered or upset you in your relationships today?",
    ],
  },
};

/**
 * [분석 함수] 사용자의 답변이 충분한지 검사합니다.
 */
export async function analyzeAnswerForFollowup(
  question: string,
  answer: string,
  allAnswers: Record<string, string> = {},
  language: Language = "ko"
): Promise<{ needsFollowup: boolean; followupQuestion?: string }> {
  if (!GEMINI_API_KEY) return { needsFollowup: false };

  const answerLength = answer.trim().length;
  const answerLower = answer.trim().toLowerCase();
  const dontKnowPhrases = language === "ko"
    ? ["모르겠", "잘 모르겠", "말하기 어려", "기분은 잘 모르겠", "말 못하겠"]
    : ["don't know", "not sure", "can't say", "hard to say", "don't remember"];
  if (dontKnowPhrases.some((p) => answerLower.includes(p))) {
    return { needsFollowup: false };
  }
  if (answerLength < 10) {
    const msg =
      language === "en"
        ? "That moment sounds interesting. What comes to mind when you think back to it?"
        : "그때를 떠올려보면 어떤 게 가장 먼저 생각나시나요? 궁금해요.";
    return { needsFollowup: true, followupQuestion: msg };
  }

  const contextText = Object.entries(allAnswers)
    .filter(([_, value]) => value && value.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  const isEn = language === "en";
  const prompt = isEn
    ? `You are Deary's warm editor—curious, kind, with just the right distance. Your follow-up probes DEEPER into what the user just said with CONCRETE, SPECIFIC questions. Never generic ("How did you feel?", "Tell me more").

[TONE & MANNER - Warm Editor]
- Voice: Kind and intellectually curious, like a magazine editor.
- Don't over-empathize; show curiosity about concrete FACTS.
- Use soft endings: "I'm curious...", "What was that like?", "Was it A, or rather B?"
- BAD: "That must have been hard ㅠㅠ" → GOOD: "That sounds tough. What part was the trickiest?"
- No excessive emojis or "lol". End sentences gently.

[CRITICAL - Generate from answer]
- Your follow-up MUST reference something SPECIFIC the user just said (person, place, activity, object)
- Offer choices when natural: "Was it A? Or B?"
- Example: User said "had lunch with a colleague" → Good: "What did you talk about over lunch? Anything memorable?" | Bad: "What was the highlight of your day?"
- Example: User said "just had kimbap" → Good: "Kimbap comes in so many varieties. Tuna? Or the basic kind?" | Bad: "How did you feel?"

[Today only!]
- All questions about "today" only

[Context]
${contextText || "(No context yet)"}

[Current Q&A]
Question: "${question}"
Answer: "${answer}"

[When to ask (needsFollowup: true)]
- Answer under 50 chars or evasive
- Only facts, no feelings—ask a REFLECTIVE question that invites them to think about that moment (e.g. "What stood out to you about that?", "What comes to mind when you think back?"). NEVER ask directly "How did you feel?"
- User mentioned a person/place/activity—ask about THAT specific thing
- Pick ONE concrete element from their answer and ask a question that ONLY fits that

[When to STOP (needsFollowup: false) - move to next main question]
- User said they don't know / can't express: "I don't know", "not sure", "can't say", "모르겠어", "잘 모르겠는데", "말하기 어려운데", "기분은 잘 모르겠는데"
- User already gave a feeling (tired, sleepy, etc.)—don't push for "more specific" feelings
- Rich answer with feelings and details

[FORBIDDEN]
- Generic questions that could apply to any answer
- "Could you tell me more?", "Please elaborate"
- Direct emotion questions: "How did you feel?", "How was your mood?", "What did you feel?", "What kind of mood?", "What specifically did you feel?"
- Questions that ignore what the user actually said
- Reusing the same question structure—each must be tailored to the answer

Output ONLY this JSON:
{"needsFollowup": true, "followupQuestion": "A question that references something SPECIFIC from the user's answer—generated for this answer only, not from a template"}`

    : `너는 Deary의 다정한 에디터야. 친절하고 지적인 잡지 에디터처럼 행동해. 추가 질문은 사용자가 방금 한 답변을 호기심을 가지고 구체적인 '사실'을 파는 질문이어야 해.

[Tone & Manner - 다정한 에디터]
- 말투: ~했군요, ~했는지 궁금해요, ~드셨어요? (청유형)
- 호칭: '사용자님' 대신 생략하거나 '당신'
- 공감만 하지 말고, 호기심을 가지고 구체적인 사실을 물어봐
- 나쁨: "힘드셨겠어요 ㅠㅠ" → 좋음: "정말 고생 많으셨네요. 어떤 부분이 제일 까다로웠나요?"
- 과도한 이모지, 'ㅋㅋ' 금지. 문장 끝을 부드럽게 맺어
- 선택지 제시: "참치김밥? 아니면 기본?" / "혼자 드셨어요, 아니면 동료들이랑?"

[예시 대화]
User: "그냥 김밥 먹었어." → AI: "김밥이라도 종류가 많잖아요. 혹시 참치김밥? 아니면 기본?"
User: "참치." → AI: "오, 든든했겠네요. 혼자 드셨어요, 아니면 동료들이랑?"

[🚨 절대 규칙 - 답변에 맞춰 새로 생성]
- 사용자가 방금 말한 내용(사람, 장소, 일, 물건)을 반드시 직접 언급
- 이 답변에만 통하는 질문. "기분이 어땠나요?", "더 말해줘" 같은 추상적 질문 금지

[오늘 일기만!]
- 모든 질문은 "오늘"에 대해서만

[맥락]
${contextText || "(아직 맥락 없음)"}

[현재 질문과 답변]
질문: "${question}"
답변: "${answer}"

[추가 질문 해야 할 때 (needsFollowup: true)]
- 답변이 50자 미만, "몰라" "그냥" 같은 회피
- 사실만 말하고 감정 없음 → 그 순간을 돌아보게 하는 질문 (예: "그때 어떤 게 가장 떠오르시나요?", "그 장면을 떠올려보면 어떤 생각이 드나요?"). 절대 "기분이 어땠나요?"처럼 직접 감정을 묻지 말 것
- 답변에 사람/장소/일이 나왔음 → 그 구체적인 것 하나를 골라서 거기에 맞는 질문 생성
- 답변 내용을 읽고, 가장 파고들 만한 부분 하나를 골라서 그에 맞는 질문을 새로 만든다

[그만 물어볼 때 (needsFollowup: false) - 다음 메인 질문으로]
- 사용자가 모른다/말하기 어렵다고 함: "모르겠어", "잘 모르겠는데", "말하기 어려운데", "기분은 잘 모르겠는데"
- 사용자가 이미 감정을 말함 (피곤해, 졸려 등)—"더 구체적으로" 감정을 묻지 말 것
- 감정·구체적 묘사가 충분한 풍부한 답변
- 물어봐도 반복만 될 때

[🚫 절대 쓰지 마]
- 어떤 답변에나 쓸 수 있는 일반적인 질문
- "조금 더 자세히 말씀해 주실 수 있을까요?", "자세히 이야기해 주세요"
- 직접 감정 질문: "기분이 어땠나요?", "어떻게 느꼈나요?", "어떤 감정이었나요?", "구체적으로 어떤 기분이 드셨나요?", "어떤 기분이 드셨는지"
- 사용자가 말한 내용을 무시한 질문
- 같은 구조의 질문 반복—매번 답변에 맞춰 새로 만든다

반드시 JSON만 출력:
{"needsFollowup": true, "followupQuestion": "사용자 답변에 나온 구체적인 내용을 직접 언급하면서, 이 답변에만 통하는 질문 (템플릿 X, 매번 새로 생성)"}`;

  try {
    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
            response_mime_type: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      if (answerLength < 30) {
        return {
          needsFollowup: true,
          followupQuestion: isEn
            ? "That moment sounds interesting. What comes to mind when you think back to it?"
            : "그때를 떠올려보면 어떤 게 가장 먼저 생각나시나요? 궁금해요.",
        };
      }
      return { needsFollowup: false };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    if (answerLength < 30) {
      return {
        needsFollowup: true,
        followupQuestion: isEn
          ? "That moment sounds interesting. What comes to mind when you think back to it?"
          : "그때를 떠올려보면 어떤 게 가장 먼저 생각나시나요? 궁금해요.",
      };
    }
    return { needsFollowup: false };
  } catch (error) {
    console.error("💥 [AI] Follow-up analysis error:", error);
    if (answerLength < 30) {
      return {
        needsFollowup: true,
        followupQuestion: isEn
          ? "That moment sounds interesting. What comes to mind when you think back to it?"
          : "그때를 떠올려보면 어떤 게 가장 먼저 생각나시나요? 궁금해요.",
      };
    }
    return { needsFollowup: false };
  }
}

/**
 * [생성 함수] 수집된 답변을 바탕으로 최종 일기를 작성합니다.
 */
export async function generateDiary(
  answers: Record<string, string>,
  language: Language = "ko"
): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

  const answersText = Object.entries(answers)
    .filter(([_, value]) => value && value.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  const isEn = language === "en";
  const prompt = isEn
    ? `You are an 'honest recorder' who summarizes the user's day based on their answers.

[Rules]
1. Style: Use past tense ("~ed", "was ~"). (e.g., ate, was happy, felt tired)
2. Fact-based: Never invent info (place, weather, people) the user didn't mention. (No hallucination)
3. Simple: Use easy words. No abstract or academic phrases.
4. Flow: Connect answers in a natural time order.
5. Emotion: Reflect the user's feelings and experiences vividly.

User answers:
${answersText}

Write the diary body only:`

    : `너는 사용자의 답변을 바탕으로 오늘 하루를 정리해주는 '정직한 기록가'야.

[작성 규칙 - 엄격 준수]
1. 문체: 반드시 '~했다', '~였다'와 같은 평어체(일기체)로 작성할 것.
2. 사실 근거: 사용자가 직접 말하지 않은 정보는 절대로 지어내지 말 것.
3. 담백함: 현학적이거나 추상적인 표현은 절대로 쓰지 말 것.
4. 연결성: 답변들을 시간 순서에 따라 자연스러운 문장으로 연결할 것.
5. 감정 표현: 사용자가 말한 감정과 경험을 생생하게 살려서 작성할 것.

사용자 답변 데이터:
${answersText}

일기 본문만 작성해:`;

  try {
    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorDetail = await response.text();
      throw new Error(`API error: ${response.status} - ${errorDetail}`);
    }

    const data = await response.json();
    const result =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      (isEn
        ? "Could not complete the diary due to insufficient information."
        : "기록된 내용이 없어 일기를 완성하지 못했다.");

    return result;
  } catch (error) {
    console.error("Diary generation error:", error);
    throw error;
  }
}

/**
 * [검토 함수] 일기 작성 전에 전체 답변을 검토합니다.
 */
export async function reviewAnswersBeforeDiary(
  answers: Record<string, string>,
  language: Language = "ko"
): Promise<{ needsMoreInfo: boolean; question?: string }> {
  if (!GEMINI_API_KEY) return { needsMoreInfo: false };

  const answersText = Object.entries(answers)
    .filter(([_, value]) => value && value.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  const isEn = language === "en";
  const prompt = isEn
    ? `You are a warm editor who reviews whether the user's answers are sufficient before writing a diary.

[Tone & Manner - when asking a question]
- Voice: "I'm curious...", "What was it like?" Offer choices when natural.
- Show curiosity about concrete facts, not just empathy.

[Review criteria]
1. Flow: Is there a flow from morning to evening? Are main activities mentioned?
2. Depth: Beyond "good" or "tired", is there a reason why?
3. Detail: Are there specific people, places, times, situations?
4. Story: Would reading this later bring the day back vividly?

User answers:
${answersText}

[Rules]
- If 2 or fewer answers or all under 10 chars → needsMoreInfo: true
- If only emotions and no concrete events → needsMoreInfo: true
- If rich enough for a diary → needsMoreInfo: false

Output ONLY this JSON:
{"needsMoreInfo": true/false, "question": "A natural follow-up question"}`

    : `너는 일기를 작성하기 전에 사용자의 답변이 충분한지 마지막으로 검토하는 '다정한 에디터'야.

[Tone & Manner - 질문 시]
- 말투: ~했군요, ~했는지 궁금해요 (청유형). 선택지 제시 가능.
- 공감만 하지 말고 구체적인 사실을 물어봐.

[검토 기준]
1. 하루의 흐름: 아침부터 저녁까지의 흐름이 보이는가?
2. 감정의 깊이: 왜 그랬는지 이유가 있는가?
3. 구체성: 사람, 장소, 시간, 상황 등 구체적인 정보가 있는가?
4. 이야기성: 나중에 이 일기를 읽었을 때 그날이 생생하게 떠오를 수 있을까?

사용자 답변:
${answersText}

[판단 규칙]
- 답변이 2개 이하거나 모두 10자 미만이면 → needsMoreInfo: true
- 감정만 있고 구체적 사건이 없으면 → needsMoreInfo: true
- 일기로 쓰기에 충분히 풍부하면 → needsMoreInfo: false

반드시 아래의 JSON 형식으로만 응답해:
{"needsMoreInfo": true/false, "question": "부족한 부분을 채울 자연스러운 질문"}`;

  try {
    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
            response_mime_type: "application/json",
          },
        }),
      }
    );

    if (!response.ok) return { needsMoreInfo: false };

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return { needsMoreInfo: false };
  } catch (error) {
    console.error("💥 [AI] Review error:", error);
    return { needsMoreInfo: false };
  }
}

/**
 * [추론 함수] 사용자의 답변에서 프로필(페르소나) 정보를 추출합니다.
 * 대학생, 취미, 친구, 직업 등 기록할 만한 정보를 수집해 저장합니다.
 */
export async function extractUserProfile(
  answers: Record<string, string>,
  existingProfile: Record<string, unknown> = {},
  language: Language = "ko"
): Promise<Record<string, unknown>> {
  if (!GEMINI_API_KEY) return existingProfile;

  const answersText = Object.entries(answers)
    .filter(([_, value]) => value && value.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  const isEn = language === "en";
  const prompt = isEn
    ? `Extract profile/persona info from the user's answers. Save anything worth remembering for future conversations.
Existing profile (merge new info, preserve existing): ${JSON.stringify(existingProfile)}
Answers: ${answersText}

Output JSON only. Extract:
- occupation: job, student status (e.g. "college student", "office worker")
- education: school, major, grade if mentioned
- hobbies: ONLY add items mentioned REPEATEDLY (2+ times) across answers. One-off mentions (e.g. "played a game today") do NOT count as hobbies.
- friends: array of people mentioned (names or relationships like "colleague", "roommate")
- interests: ONLY add items mentioned REPEATEDLY (2+ times). Single mention = not an interest.
- lifestyle: daily routine, habits
- relationships: family, partner, etc.
- ageGroup: "teen", "20s", "30s" etc.
- aiName, aiTone: only if user explicitly sets (else null, preserve existing)

Use null for unknown. For arrays, ADD new items to existing, don't replace. Merge with existing profile.`
    : `사용자 답변에서 프로필(페르소나) 정보를 추출해. 나중에 연관 질문을 위해 기록할 만한 정보를 수집해.
기존 프로필 (새 정보 병합, 기존 유지): ${JSON.stringify(existingProfile)}
답변: ${answersText}

JSON만 출력. 추출할 항목:
- occupation: 직업, 학생 여부 (예: "대학생", "직장인")
- education: 학교, 전공, 학년 등
- hobbies: 반복적으로 언급된 것만 취미로 추가 (2회 이상). 한 번만 말한 건 취미 아님 (예: "오늘 게임했어" 1회 → 취미 X)
- friends: 언급된 사람 배열 (이름 또는 "동료", "룸메이트" 등 관계)
- interests: 반복적으로 언급된 것만 (2회 이상). 1회 언급 = 관심사 아님
- lifestyle: 일상, 습관
- relationships: 가족, 연인 등
- ageGroup: "10대", "20대", "30대" 등
- aiName, aiTone: 사용자가 직접 설정한 경우만 (없으면 null, 기존 유지)

모르면 null. 배열은 기존에 새 항목 추가, 교체하지 말 것. 기존 프로필과 병합.`;

  try {
    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
            response_mime_type: "application/json",
          },
        }),
      }
    );

    if (!response.ok) return existingProfile;

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const newProfile = JSON.parse(jsonMatch[0]);
      const merged = { ...existingProfile };
      const arrayKeys = ["hobbies", "friends", "interests"];
      for (const [key, value] of Object.entries(newProfile)) {
        if (value === null || value === undefined) continue;
        if (arrayKeys.includes(key) && Array.isArray(value)) {
          const existing = (merged[key] as unknown[]) || [];
          const combined = [...new Set([...existing, ...value])].filter(Boolean);
          if (combined.length > 0) merged[key] = combined;
        } else {
          merged[key] = value;
        }
      }
      return merged;
    }
    return existingProfile;
  } catch (error) {
    console.error("💥 [AI] Profile extraction error:", error);
    return existingProfile;
  }
}

/**
 * [생성 함수] 맥락을 고려한 다음 질문을 생성합니다.
 */
export async function generateNextQuestion(
  previousAnswers: Record<string, string>,
  userProfile: Record<string, unknown> = {},
  questionCount: number = 0,
  language: Language = "ko",
  skippedQuestion?: string,
  askedQuestions: string[] = []
): Promise<{ question: string; shouldEnd: boolean }> {
  const pools = QUESTION_POOLS[language === "en" ? "en" : "ko"];

  if (!GEMINI_API_KEY) {
    return {
      question: pools.theme1_morning[0],
      shouldEnd: false,
    };
  }

  const answersText = Object.entries(previousAnswers)
    .filter(([_, value]) => value && value.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  const profileText =
    Object.keys(userProfile).length > 0
      ? JSON.stringify(userProfile, null, 2)
      : language === "en"
        ? "No profile info yet"
        : "아직 프로필 정보 없음";

  const isEn = language === "en";
  const prompt = isEn
    ? `You are Deary's warm editor—kind, intellectually curious, with just the right distance. You help the user reflect on their day through CONCRETE, THEMED questions. Never vague ("How was your day?", "Anything special?").

[TONE & MANNER - Warm Editor]
- Voice: Kind and curious, like a magazine editor. Use soft endings: "I'm curious...", "I'd love to hear..."
- Don't over-empathize; show curiosity about concrete FACTS. Offer choices when natural: "Was it A? Or B?"
- BAD: "That must have been hard ㅠㅠ" → GOOD: "That sounds tough. What part was the trickiest?"
- No excessive emojis. End sentences gently.

[QUESTION POOL - PICK FROM HERE]
Choose a question from this pool, or create a natural variation within the SAME theme. Do NOT invent generic questions.

Theme 1 (Morning): ${pools.theme1_morning.join(" | ")}
Theme 2 (Highlight/Events): ${pools.theme2_highlight.join(" | ")}
Theme 3 (Food/Taste): ${pools.theme3_food.join(" | ")}
Theme 4 (Work/School): ${pools.theme4_work.join(" | ")}
Theme 5 (Relationships): ${pools.theme5_relationships.join(" | ")}

[RULES]
- FIRST QUESTION (questionCount=0): Pick Theme 1 (Morning). Use theme1_morning[0], [1], [2], or [3]. NEVER [4] (how you felt) for the first question.
- Pick a theme not yet covered (or least covered). Vary themes.
- Use the pool question or a natural variation. Never "How was your day?", "Anything special?"
- Today only! Use "today morning", "today" naturally.

[ALREADY ASKED - DO NOT REPEAT]
${askedQuestions.length > 0 ? askedQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n") : "(none yet)"}

Your new question MUST be from a different theme or a different question in the pool. If similar to any above, pick another.

[Context]
${answersText || "(First question)"}

User profile: ${profileText}
${questionCount} questions completed.
${skippedQuestion ? `\n[SKIP] User skipped: "${skippedQuestion}" - pick a COMPLETELY different theme/question.\n` : ""}

[End criteria] shouldEnd: true if 4+ questions done and main themes covered; else false.

Output ONLY this JSON:
{"question": "One question from the pool or a natural variation", "shouldEnd": false}`

    : `너는 Deary의 다정한 에디터야. 친절하고 지적인 잡지 에디터처럼 행동해. 사용자의 하루를 구체적이고 테마 있는 질문으로 돌아본다.

[Tone & Manner - 다정한 에디터]
- 말투: ~했군요, ~했는지 궁금해요, ~드셨어요? (청유형)
- 호칭: '사용자님' 대신 생략. 과도한 이모지, 'ㅋㅋ' 금지.
- 공감만 하지 말고, 호기심을 가지고 구체적인 사실을 물어봐
- 선택지 제시: "참치김밥? 아니면 기본?" / "혼자 드셨어요, 아니면 동료들이랑?"
- 예: "오늘 점심은 뭐 드셨어요? 맛있는 거 드셨으면 좋겠는데."

[질문 풀 - 여기서 골라 쓸 것]
풀에서 질문을 고르거나 같은 테마 안에서 자연스럽게 변형. 풀 밖의 일반적 질문 금지.

테마1 (하루의 시작): ${pools.theme1_morning.join(" | ")}
테마2 (강렬한 기억): ${pools.theme2_highlight.join(" | ")}
테마3 (미각과 휴식): ${pools.theme3_food.join(" | ")}
테마4 (사회생활/성취): ${pools.theme4_work.join(" | ")}
테마5 (관계와 대화): ${pools.theme5_relationships.join(" | ")}

[규칙]
- 첫 질문(questionCount=0): 테마1 사용. theme1의 1~4번 중에서. 5번(첫 기분)은 첫 질문에 금지.
- 아직 다루지 않은 테마를 골라라. "오늘 어땠어?", "특별한 일 없었어?" 금지.
- 오늘만! "오늘 아침", "오늘"을 자연스럽게.

[이미 한 질문 - 절대 반복 금지]
${askedQuestions.length > 0 ? askedQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n") : "(아직 없음)"}

새 질문은 위와 다른 테마이거나 풀의 다른 질문이어야 함. 비슷하면 다른 걸 골라라.

[맥락]
${answersText || "(첫 질문)"}

사용자 프로필: ${profileText}
현재 ${questionCount}개 질문 완료.
${skippedQuestion ? `\n[스킵] 사용자가 스킵함: "${skippedQuestion}" - 완전히 다른 테마/질문을 골라라.\n` : ""}

[종료] 4개 이상 질문했고 주요 테마가 나왔으면 shouldEnd: true, 아니면 false.

반드시 JSON만 출력:
{"question": "풀에서 고른 질문 또는 자연스러운 변형", "shouldEnd": false}`;

  const fallbacksKo = [
    pools.theme1_morning[0],
    pools.theme3_food[0],
    pools.theme2_highlight[0],
    pools.theme5_relationships[0],
    pools.theme4_work[0],
  ];
  const fallbacksEn = [
    pools.theme1_morning[0],
    pools.theme3_food[0],
    pools.theme2_highlight[0],
    pools.theme5_relationships[0],
    pools.theme4_work[0],
  ];
  const pickFallback = (list: string[], asked: string[]) => {
    const notAsked = list.filter((q) => !asked.some((a) => a === q || a.includes(q) || q.includes(a)));
    return notAsked[0] ?? list[questionCount % list.length];
  };

  try {
    const response = await fetch(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 1000,
            response_mime_type: "application/json",
          },
        }),
      }
    );

    const fallbackQ = isEn ? pickFallback(fallbacksEn, askedQuestions) : pickFallback(fallbacksKo, askedQuestions);

    if (!response.ok) {
      return { question: fallbackQ, shouldEnd: false };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const q = parsed?.question?.trim();
      if (q && !askedQuestions.some((a) => a === q || a.includes(q) || q.includes(a))) {
        return parsed;
      }
      return { question: fallbackQ, shouldEnd: parsed?.shouldEnd ?? false };
    }
    return { question: fallbackQ, shouldEnd: false };
  } catch (error) {
    console.error("💥 [AI] Question generation error:", error);
    const fallbackQ = isEn ? pickFallback(fallbacksEn, askedQuestions) : pickFallback(fallbacksKo, askedQuestions);
    return { question: fallbackQ, shouldEnd: false };
  }
}
