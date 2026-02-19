const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

export type Language = "ko" | "en";

function getLang(lang?: string): Language {
  return lang === "en" ? "en" : "ko";
}

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
  if (answerLength < 10) {
    const msg =
      language === "en"
        ? "I'd like to understand that moment better. What was going through your mind at that time?"
        : "그 순간이 궁금하네요. 그때 어떤 생각이나 느낌이 들었나요?";
    return { needsFollowup: true, followupQuestion: msg };
  }

  const contextText = Object.entries(allAnswers)
    .filter(([_, value]) => value && value.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  const isEn = language === "en";
  const prompt = isEn
    ? `You are a warm, professional counselor or consultant who helps the user reflect on their day. You listen with empathy, validate what they share, and ask thoughtful follow-ups to help them articulate their experiences. Interview-like flow is fine, but never ask the same type of question twice in a row—vary your angle.

[TONE - Consultant/Counselor]
- Warm, respectful, professional but approachable
- Acknowledge before asking: "That sounds meaningful. What made it stand out today?"
- NEVER use generic phrases: "Could you tell me more?", "Please elaborate", "I'd like to hear more details"
- Ask specific, varied questions—pick ONE thing from their answer and go deeper from a different angle each time

[CRITICAL: Today only!]
- All follow-up questions must be about "today" only!

[Context]
${contextText || "(No context yet)"}

[Current Q&A]
Question: "${question}"
Answer: "${answer}"

[When to ask (needsFollowup: true)]
- Answer under 50 chars, or evasive ("dunno", "nothing")
- Only facts, no feelings—ask about feelings
- Missing who/where/how/why—pick ONE and ask specifically
- User mentioned something interesting—dig into that one thing!

[When to stop (needsFollowup: false)]
- Rich answer with feelings and details
- Nothing more to ask without being repetitive

[CRITICAL - Question variety]
- Never ask two similar questions in a row (e.g. "how did you feel?" twice)
- If you already asked about feelings, ask about who/where/what/how instead
- Vary the angle each time

[FORBIDDEN]
- "Could you tell me more?"
- "Please elaborate"
- "I'd like to hear more"
- Repetitive or nearly identical phrasing to previous questions

Output ONLY this JSON:
{"needsFollowup": true, "followupQuestion": "One specific counselor-style question about TODAY—pick ONE thing from their answer, use a different angle than before"}`

    : `너는 사용자의 하루를 함께 돌아보는 따뜻한 상담가/컨설턴트야. 공감하며 듣고, 말한 내용을 받아주면서, 그 경험을 더 잘 드러내도록 질문을 이어간다. 인터뷰 느낌이 나도 괜찮지만, 같은 질문을 반복해서 하지 않는다. 매번 다른 각도로 물어본다.

[🎯 말투 - 상담가/컨설턴트]
- 따뜻하고 존중하는, 전문적이면서도 편한 말투
- "~세요", "~해요" 체 사용
- 물어보기 전에 받아주기: "그런 일이 있었군요. 오늘 그때 어떤 느낌이었나요?"
- "조금 더 자세히 말씀해 주실 수 있을까요?", "자세히 이야기해 주세요" 같은 말 절대 금지! 피로감만 줌
- 구체적으로, 매번 다른 각도로 물어보기

[🚨 절대 규칙: 오늘 일기만!]
- 모든 질문은 "오늘"에 대해서만!

[맥락]
${contextText || "(아직 맥락 없음)"}

[현재 질문과 답변]
질문: "${question}"
답변: "${answer}"

[추가 질문 해야 할 때 (needsFollowup: true)]
- 답변이 50자 미만, 혹은 "몰라", "그냥" 같은 회피
- 사실만 있고 감정 없음 → 감정 물어보기
- 누구/어디/어떻게/왜 중 빠진 게 있음 → 하나 골라서 구체적으로
- 답변에 뭔가 흥미로운 게 나왔음 → 그 하나만 파고들기!

[그만 물어볼 때 (needsFollowup: false)]
- 감정·구체적 묘사 다 있는 풍부한 답변
- 물어봐도 반복만 될 때

[🚫 절대 쓰지 마]
- "조금 더 자세히 말씀해 주실 수 있을까요?"
- "자세히 이야기해 주세요"
- "추가로 말씀해 주실 수 있을까요?"
- 이전 질문과 거의 비슷한 질문 (예: "기분이 어땠나요?" 같은 질문을 연속으로)

[중요 - 질문 다양성]
- 같은 유형의 질문을 연속으로 하지 마 (예: "기분이 어땠나요?" 두 번)
- 이미 감정을 물었으면, 다음엔 누구/어디/무엇/어떻게 등 다른 각도로
- 매번 다른 시각으로 물어보기

반드시 JSON만 출력:
{"needsFollowup": true, "followupQuestion": "답변에서 딱 하나 골라서, 상담가처럼 구체적으로 물어보는 질문 (오늘 기준, 이전과 다른 각도)"}`;

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
            ? "I'd like to understand that moment better. What was going through your mind at that time?"
            : "그 순간이 궁금하네요. 그때 어떤 생각이나 느낌이 들었나요?",
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
          ? "I'd like to understand that moment better. What was going through your mind at that time?"
          : "그 순간이 궁금하네요. 그때 어떤 생각이나 느낌이 들었나요?",
      };
    }
    return { needsFollowup: false };
  } catch (error) {
    console.error("💥 [AI] Follow-up analysis error:", error);
    if (answerLength < 30) {
      return {
        needsFollowup: true,
        followupQuestion: isEn
          ? "I'd like to understand that moment better. What was going through your mind at that time?"
          : "그 순간이 궁금하네요. 그때 어떤 생각이나 느낌이 들었나요?",
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
    ? `You are a 'strict editor' who reviews whether the user's answers are sufficient before writing a diary.

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

    : `너는 일기를 작성하기 전에 사용자의 답변이 충분한지 마지막으로 검토하는 '까다로운 편집자'야.

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
 * [추론 함수] 사용자의 답변에서 프로필 정보를 추출합니다.
 */
export async function extractUserProfile(
  answers: Record<string, string>,
  existingProfile: Record<string, unknown> = {},
  _language: Language = "ko"
): Promise<Record<string, unknown>> {
  if (!GEMINI_API_KEY) return existingProfile;

  const answersText = Object.entries(answers)
    .filter(([_, value]) => value && value.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");

  const prompt = `Extract profile info from the user's answers. Output JSON only.
Existing profile: ${JSON.stringify(existingProfile)}
Answers: ${answersText}
Output: {"job": "...", "ageGroup": "...", "gender": "...", "hobbies": [], "interests": [], "lifestyle": "...", "relationships": "..."}
Use null for unknown.`;

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
      for (const [key, value] of Object.entries(newProfile)) {
        if (value !== null && value !== undefined) {
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
  language: Language = "ko"
): Promise<{ question: string; shouldEnd: boolean }> {
  if (!GEMINI_API_KEY) {
    return {
      question:
        language === "en"
          ? "How did your day start today?"
          : "오늘 하루는 어떤 일들로 시작되었나요?",
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
    ? `You are a warm, professional counselor or consultant who helps the user reflect on their day. You ask thoughtful questions in a respectful, supportive tone. Interview-like flow is fine, but vary your questions—don't ask the same type in a row.

[TONE - Consultant/Counselor]
- Warm, respectful, professional but approachable
- Use phrases like "I'd like to hear more about...", "What stood out to you...", "How did that feel..."
- Never generic or robotic

[CRITICAL: Today only!]
- All questions must be about "today" only!
- Use "today morning", "today afternoon", "today evening" naturally
- Never "recently", "lately", "usually", "generally"

[Full context]
All Q&A so far:
${answersText || "(First question)"}

User profile:
${profileText}

${questionCount} questions completed.

[Checklist]
✅ Don't repeat info already in the conversation!
✅ Ask about new time slots, activities, or emotions
✅ Vary question types—never two similar in a row

[End criteria]
- 4+ questions and main activities + emotions covered → shouldEnd: true
- 3 or fewer or info lacking → shouldEnd: false
- User keeps giving short/meaningless answers → shouldEnd: true

Output ONLY this JSON:
{"question": "A counselor-style question about today", "shouldEnd": false}`

    : `너는 사용자의 "오늘 하루"를 함께 돌아보는 따뜻한 상담가/컨설턴트야. 존중하고 공감하는 말투로 질문한다. 인터뷰 느낌이 나도 괜찮지만, 같은 유형의 질문을 연속으로 하지 않는다.

[🎯 말투 - 상담가/컨설턴트]
- 따뜻하고 존중하는, 전문적이면서도 편한 말투
- "~세요", "~해요" 체 사용

[🚨 절대 규칙: 오늘 일기만!]
- 모든 질문은 "오늘"에 대해서만!
- "최근", "요즘", "평소", "일반적으로" 같은 단어 절대 사용 금지!
- "오늘 아침", "오늘 점심", "오늘 저녁"처럼 오늘을 명시할 것!

[🚨 중요! 전체 대화 맥락]
아래는 지금까지 나온 모든 질문과 답변이야.
${answersText || "(첫 질문)"}

사용자 프로필:
${profileText}

현재 ${questionCount}개 질문 완료

[질문 생성 전 필수 체크리스트]
✅ 위 대화에서 이미 나온 정보를 다시 묻지 말 것!
✅ 새로운 시간대/활동/감정을 물어볼 것
✅ 이미 언급된 내용은 더 깊게 파고들기
✅ 같은 유형의 질문을 연속으로 하지 말 것!

[종료 기준]
- 4개 이상 질문했고, 오늘 하루의 주요 활동과 감정이 모두 나왔으면 → shouldEnd: true
- 아직 3개 이하이거나 오늘의 정보가 부족하면 → shouldEnd: false
- 답변이 계속 짧고 의미 없으면 → shouldEnd: true

반드시 아래의 JSON만 출력해:
{"question": "상담가 말투의 오늘에 대한 질문", "shouldEnd": false}`;

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

    if (!response.ok) {
      return {
        question: isEn
          ? "What was the most memorable moment of your day today?"
          : "오늘 하루 중 가장 기억에 남는 순간은 언제였나요?",
        shouldEnd: false,
      };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);

    return {
      question: isEn
        ? "What was the most memorable moment of your day today?"
        : "오늘 하루 중 가장 기억에 남는 순간은 언제였나요?",
      shouldEnd: false,
    };
  } catch (error) {
    console.error("💥 [AI] Question generation error:", error);
    return {
      question: isEn
        ? "What was the most memorable moment of your day today?"
        : "오늘 하루 중 가장 기억에 남는 순간은 언제였나요?",
      shouldEnd: false,
    };
  }
}
