import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Send } from "lucide-react";
import type { DiaryAnswers, DiaryEntry, Language } from "../App";
import { apiBaseUrl, publicAnonKey } from "../utils/supabase/info";

interface QuestionFormProps {
  onDiaryGenerated: (diary: DiaryEntry) => void;
  language?: Language;
}

interface Message {
  type: "question" | "answer" | "followup";
  text: string;
  questionId?: string;
}

let initialFetchPending = false;

function getUserId(): string {
  let userId = localStorage.getItem("deary_user_id");
  if (!userId) {
    userId =
      (window.crypto?.randomUUID && window.crypto.randomUUID()) ||
      `user_${Math.random().toString(36).slice(2, 9)}_${Date.now()}`;
    localStorage.setItem("deary_user_id", userId);
  }
  return userId;
}

export function QuestionForm({
  onDiaryGenerated,
  language = "ko",
}: QuestionFormProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionCount, setQuestionCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputText, setInputText] = useState("");
  const [waitingForFollowup, setWaitingForFollowup] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>("");
  const [followupCount, setFollowupCount] = useState<Record<string, number>>({});
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [micError, setMicError] = useState<string>("");
  const [speechRecognitionAvailable, setSpeechRecognitionAvailable] =
    useState(false);
  const [userId] = useState(getUserId());

  const recognitionRef = useRef<{ start(): void; stop(): void; lang: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = {
    ko: {
      placeholder: "답변을 입력하거나 마이크 버튼을 눌러 말씀해주세요",
      listening: "듣고 있습니다...",
      followupLabel: "추가 질문",
      stopRecording: "녹음 중지",
      voiceInput: "음성 입력",
      send: "답변 전송",
      generating: "AI가 일기를 작성하고 있어요... ✨",
      micChromeOnly: "음성 인식 기능은 Chrome 브라우저에서만 지원됩니다",
      micBlocked:
        "마이크 사용이 차단되었습니다. 브라우저 주소창 옆 자물쇠 아이콘을 클릭하여 마이크 권한을 허용해주세요.",
      micNoSpeech: "음성이 감지되지 않았습니다. 다시 시도해주세요.",
      micNoDevice: "마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.",
      micNetwork: "네트워크 오류가 발생했습니다.",
      micError: "음성 인식 오류",
      micStartError: "음성 인식을 시작할 수 없습니다.",
      skipPhrases: ["넘어가", "패스", "다음", "스킵", "건너뛰", "그냥 넘어", "다음 질문"],
      fallbackFirst: "오늘은 어떤 하루였나요?",
      fallbackNext: "그 외에 더 말씀하고 싶은 이야기가 있나요?",
      summaryPrefix: "알겠어요!",
      errorPrefix: "일기 생성 중 오류가 발생했습니다",
    },
    en: {
      placeholder: "Type your answer or tap the mic button",
      listening: "Listening...",
      followupLabel: "Follow-up",
      stopRecording: "Stop recording",
      voiceInput: "Voice input",
      send: "Send",
      generating: "AI is writing your diary... ✨",
      micChromeOnly: "Voice recognition is only supported in Chrome",
      micBlocked:
        "Microphone access was denied. Please allow microphone permission in your browser.",
      micNoSpeech: "No speech detected. Please try again.",
      micNoDevice: "Microphone not found. Please check if your microphone is connected.",
      micNetwork: "Network error occurred.",
      micError: "Speech recognition error",
      micStartError: "Could not start voice recognition.",
      skipPhrases: ["skip", "next", "pass", "move on"],
      fallbackFirst: "How was your day today?",
      fallbackNext: "Is there anything else you'd like to share?",
      summaryPrefix: "Got it!",
      errorPrefix: "An error occurred while generating your diary",
    },
  };
  const text = language === "en" ? t.en : t.ko;

  const baseUrl = apiBaseUrl;

  useEffect(() => {
    if (initialFetchPending) return;
    initialFetchPending = true;

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      setSpeechRecognitionAvailable(true);
      const SR =
        (window as unknown as { webkitSpeechRecognition?: new () => unknown })
          .webkitSpeechRecognition ||
        (window as unknown as { SpeechRecognition?: new () => unknown })
          .SpeechRecognition;
      if (SR) {
        const recognition = new SR() as {
          continuous: boolean;
          interimResults: boolean;
          lang: string;
          onresult: (e: { results: { 0: { 0: { transcript: string } } } }) => void;
          onerror: (e: { error: string }) => void;
          onend: () => void;
          start(): void;
          stop(): void;
        };
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = language === "en" ? "en-US" : "ko-KR";

        recognition.onresult = (event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
          setIsListening(false);
          setMicError("");
        };

        recognition.onerror = (event: { error: string }) => {
          setIsListening(false);
          if (event.error === "not-allowed") {
            setMicPermissionDenied(true);
            setMicError(text.micBlocked);
          } else if (event.error === "no-speech") {
            setMicError(text.micNoSpeech);
          } else if (event.error === "audio-capture") {
            setMicError(text.micNoDevice);
          } else if (event.error === "network") {
            setMicError(text.micNetwork);
          } else {
            setMicError(`${text.micError}: ${event.error}`);
          }
        };

        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      }
    }
    loadUserProfile();
    fetchNextQuestion().finally(() => {
      initialFetchPending = false;
    });
  }, []);

  useEffect(() => {
    recognitionRef.current && (recognitionRef.current.lang = language === "en" ? "en-US" : "ko-KR");
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadUserProfile = async () => {
    try {
      await fetch(`${baseUrl}/get-profile/${userId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });
    } catch (error) {
      console.error("Profile load error:", error);
    }
  };

  const fetchNextQuestion = async (overrideCount?: number) => {
    const count = overrideCount ?? questionCount;
    try {
      const response = await fetch(`${baseUrl}/next-question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          answers,
          userId,
          questionCount: count,
          language,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.shouldEnd) {
          await generateDiary();
        } else {
          const questionId = `q_${count}`;
          setMessages((prev) => [
            ...prev,
            { type: "question", text: result.question, questionId },
          ]);
        }
      } else {
        const fallback =
          count === 0 ? text.fallbackFirst : text.fallbackNext;
        const questionId = `q_${count}`;
        setMessages((prev) => [
          ...prev,
          { type: "question", text: fallback, questionId },
        ]);
      }
    } catch (error) {
      const fallback =
        count === 0 ? text.fallbackFirst : text.fallbackNext;
      const questionId = `q_${count}`;
      setMessages((prev) => [
        ...prev,
        { type: "question", text: fallback, questionId },
      ]);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setMicError("");
      setMicPermissionDenied(false);
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (error) {
        setMicError(text.micStartError);
      }
    }
  };

  const handleSubmitAnswer = async () => {
    if (!inputText.trim() || isProcessing) return;

    const answerText = inputText.trim();
    setInputText("");
    setIsProcessing(true);

    setMessages((prev) => [...prev, { type: "answer", text: answerText }]);

    const isSkipping = text.skipPhrases.some((phrase) =>
      answerText.toLowerCase().includes(phrase.toLowerCase())
    );

    if (isSkipping) {
      await new Promise((r) => setTimeout(r, 500));
      setWaitingForFollowup(false);
      setCurrentQuestionId("");
      await updateUserProfile();
      setQuestionCount((prev) => prev + 1);
      await fetchNextQuestion(questionCount + 1);
      setIsProcessing(false);
      return;
    }

    await new Promise((r) => setTimeout(r, 500));

    if (waitingForFollowup) {
      const mainQuestionId = currentQuestionId;
      const currentCount = followupCount[mainQuestionId] || 0;
      const updatedAnswers = {
        ...answers,
        [mainQuestionId]: (answers[mainQuestionId] || "") + " " + answerText,
      };
      setAnswers(updatedAnswers);

      if (currentCount < 3) {
        try {
          const response = await fetch(`${baseUrl}/analyze-answer`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({
              question: "Follow-up answer",
              answer: answerText,
              allAnswers: updatedAnswers,
              language,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.needsFollowup && result.followupQuestion) {
              setFollowupCount((prev) => ({
                ...prev,
                [mainQuestionId]: currentCount + 1,
              }));
              setMessages((prev) => [
                ...prev,
                {
                  type: "followup",
                  text: result.followupQuestion,
                  questionId: mainQuestionId,
                },
              ]);
              setIsProcessing(false);
              return;
            }
          }
        } catch (error) {
          console.error("Follow-up check error:", error);
        }
      }

      setWaitingForFollowup(false);
      setCurrentQuestionId("");
      await updateUserProfile(updatedAnswers);
      setQuestionCount((prev) => prev + 1);
      await fetchNextQuestion(questionCount + 1);
    } else {
      const questionId = `q_${questionCount}`;
      const newAnswers = { ...answers, [questionId]: answerText };
      setAnswers(newAnswers);

      try {
        const response = await fetch(`${baseUrl}/analyze-answer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            question: messages[messages.length - 1]?.text || "",
            answer: answerText,
            allAnswers: newAnswers,
            language,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.needsFollowup && result.followupQuestion) {
            setWaitingForFollowup(true);
            setCurrentQuestionId(questionId);
            setMessages((prev) => [
              ...prev,
              {
                type: "followup",
                text: result.followupQuestion,
                questionId,
              },
            ]);
            setIsProcessing(false);
            return;
          }
        }
      } catch (error) {
        console.error("Analyze answer error:", error);
      }

      await updateUserProfile();
      await addSummaryAndNextQuestion();
    }

    setIsProcessing(false);
  };

  const updateUserProfile = async (overrideAnswers?: Record<string, string>) => {
    const payload = overrideAnswers ?? answers;
    try {
      await fetch(`${baseUrl}/update-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ userId, answers: payload, language }),
      });
    } catch (error) {
      console.error("Profile update error:", error);
    }
  };

  const generateDiary = async () => {
    setIsGenerating(true);

    setMessages((prev) => [
      ...prev,
      { type: "question", text: text.generating },
    ]);

    try {
      const response = await fetch(`${baseUrl}/generate-diary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ answers, language }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate diary");
      }

      const { content: diaryContent } = await response.json();

      const sorted = Object.entries(answers).sort((a, b) =>
        a[0].localeCompare(b[0])
      );
      const vals = sorted.map(([, v]) => v);
      const diaryAnswers: DiaryAnswers = {
        mood: vals[0] ?? "",
        highlight: vals[1] ?? "",
        challenge: vals[2] ?? "",
        grateful: vals[3] ?? "",
        tomorrow: vals[4] ?? "",
        ...Object.fromEntries(
          sorted.slice(5, 15).map(([k, v]) => [k, v])
        ),
      };

      const diary: DiaryEntry = {
        id: Date.now().toString(),
        date: new Date().toLocaleDateString(
          language === "en" ? "en-US" : "ko-KR",
          {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          }
        ),
        content: diaryContent,
        answers: diaryAnswers,
        timestamp: Date.now(),
      };

      setIsGenerating(false);
      onDiaryGenerated(diary);
    } catch (error) {
      console.error("Generate diary error:", error);
      setIsGenerating(false);
      const errMsg =
        error instanceof Error ? error.message : "Unknown error";
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { type: "question", text: `${text.errorPrefix}: ${errMsg}` },
      ]);
    }
  };

  const addSummaryAndNextQuestion = async () => {
    const latestAnswers = Object.values(answers).slice(-2).join(" ");
    const summary =
      latestAnswers.length > 60
        ? `${text.summaryPrefix} ${latestAnswers.substring(0, 60)}...`
        : `${text.summaryPrefix} ${latestAnswers}`;

    if (questionCount > 0) {
      setMessages((prev) => [...prev, { type: "question", text: summary }]);
      await new Promise((r) => setTimeout(r, 800));
    }

    setQuestionCount((prev) => prev + 1);
    await fetchNextQuestion(questionCount + 1);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  if (!baseUrl) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <p className="text-sm text-red-500">
          {language === "en"
            ? "Supabase configuration is missing. Please set VITE_SUPABASE_PROJECT_ID and VITE_SUPABASE_ANON_KEY."
            : "Supabase 설정이 비어 있습니다. VITE_SUPABASE_PROJECT_ID와 VITE_SUPABASE_ANON_KEY를 설정해주세요."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl flex flex-col h-[700px]">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.type === "answer" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                message.type === "answer"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                  : message.type === "followup"
                    ? "bg-blue-50 text-blue-900 border-2 border-blue-200"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {message.type === "followup" && (
                <div className="text-xs font-semibold mb-1 text-blue-600">
                  {text.followupLabel}
                </div>
              )}
              <p className="whitespace-pre-wrap">{message.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {!isGenerating && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={
                  isListening ? text.listening : text.placeholder
                }
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                disabled={isProcessing || isListening}
              />
            </div>

            <button
              onClick={toggleListening}
              disabled={isProcessing}
              className={`p-3 rounded-lg transition-all ${
                isListening
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
              title={isListening ? text.stopRecording : text.voiceInput}
            >
              {isListening ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </button>

            <button
              onClick={handleSubmitAnswer}
              disabled={!inputText.trim() || isProcessing}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-3 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title={text.send}
            >
              {isProcessing ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </button>
          </div>

          {!speechRecognitionAvailable && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              {text.micChromeOnly}
            </p>
          )}

          {(micPermissionDenied || micError) && (
            <p className="text-xs text-red-500 mt-2 text-center">{micError}</p>
          )}
        </div>
      )}
    </div>
  );
}
