import { useState, useEffect } from "react";
import { QuestionForm } from "./components/QuestionForm";
import { DiaryDisplay } from "./components/DiaryDisplay";
import { DiaryList } from "./components/DiaryList";
import { ApiStatus } from "./components/ApiStatus";
import { BookOpen, Settings, RefreshCw } from "lucide-react";
import { apiBaseUrl, publicAnonKey } from "./utils/supabase/info";

export interface DiaryAnswers {
  mood: string;
  highlight: string;
  challenge: string;
  grateful: string;
  tomorrow: string;
  /** 추가 답변 (q_5, q_6 등) - 최대 10개까지 확장 */
  [key: string]: string;
}

export interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  answers: DiaryAnswers;
  timestamp: number;
}

export type Language = "ko" | "en";

export default function App() {
  const [currentDiary, setCurrentDiary] =
    useState<DiaryEntry | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [showForm, setShowForm] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showApiStatus, setShowApiStatus] = useState(false);
  const [language] = useState<Language>(() => {
    const stored = window.localStorage.getItem("deary_language") as Language | null;
    return stored === "en" || stored === "ko" ? stored : "ko";
  });

  const handleLanguageToggle = () => {
    const next: Language = language === "ko" ? "en" : "ko";
    window.localStorage.setItem("deary_language", next);
    window.location.reload();
  };

  // Load diaries on mount
  useEffect(() => {
    loadDiaries();
  }, []);

  const loadDiaries = async () => {
    if (!apiBaseUrl) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/diaries`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDiaries(data.diaries || []);
      }
    } catch (error) {
      console.error("Error loading diaries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiaryGenerated = async (diary: DiaryEntry) => {
    if (!apiBaseUrl) {
      console.error("Supabase not configured");
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/diaries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ diary }),
      });

      if (response.ok) {
        setCurrentDiary(diary);
        setShowForm(false);
        await loadDiaries();
      }
    } catch (error) {
      console.error("Error saving diary:", error);
    }
  };

  const handleWriteNew = () => {
    setShowForm(true);
    setCurrentDiary(null);
  };

  const handleSelectDiary = (diary: DiaryEntry) => {
    setCurrentDiary(diary);
    setShowForm(false);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    loadDiaries();
  };

  const handleDeleteDiary = async (diaryId: string) => {
    if (!apiBaseUrl) return;
    try {
      const response = await fetch(`${apiBaseUrl}/diaries/${diaryId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        if (currentDiary?.id === diaryId) {
          setCurrentDiary(null);
          setShowForm(true);
        }
        await loadDiaries();
      }
    } catch (error) {
      console.error("Error deleting diary:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-10 h-10 text-amber-600" />
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-amber-900">
                  {language === "ko" ? "AI 일기장" : "AI Diary"}
                </h1>
                <p className="text-amber-700 text-sm md:text-base">
                  {language === "ko"
                    ? "몇 가지 질문에 답하면 AI가 당신만의 일기를 작성해드립니다"
                    : "Answer a few questions and AI will write a diary just for you."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-400 hover:text-amber-600 transition-colors"
                title={
                  language === "ko"
                    ? "새로고침"
                    : "Refresh"
                }
              >
                <RefreshCw
                  className={`w-6 h-6 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
              <button
                onClick={handleLanguageToggle}
                className="px-3 py-1.5 rounded-full border border-amber-200 bg-white/70 text-sm text-amber-800 hover:bg-amber-50 transition"
                title={
                  language === "ko"
                    ? "Switch to English"
                    : "한국어로 전환"
                }
              >
                {language === "ko" ? "한국어 / EN" : "KO / English"}
              </button>
              <button
                onClick={() => setShowApiStatus(true)}
                className="p-2 text-gray-400 hover:text-amber-600 transition-colors"
                title={
                  language === "ko"
                    ? "API 연결 상태 확인"
                    : "Check API connection status"
                }
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Diary List */}
          <div className="lg:col-span-1">
            <DiaryList
              diaries={diaries}
              currentDiaryId={currentDiary?.id}
              onSelectDiary={handleSelectDiary}
              onWriteNew={handleWriteNew}
              onDeleteDiary={handleDeleteDiary}
              isLoading={isLoading}
              language={language}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {showForm ? (
              <QuestionForm
                language={language}
                onDiaryGenerated={handleDiaryGenerated}
              />
            ) : (
              currentDiary && (
                <DiaryDisplay
                  diary={currentDiary}
                  onWriteNew={handleWriteNew}
                  language={language}
                />
              )
            )}
          </div>
        </div>

        {/* API Status Modal */}
        {showApiStatus && (
          <ApiStatus
            onClose={() => setShowApiStatus(false)}
            language={language}
          />
        )}
      </div>
    </div>
  );
}
