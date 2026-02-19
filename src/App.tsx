import { useState, useEffect, useRef } from "react";
import { QuestionForm } from "./components/QuestionForm";
import { DiaryDisplay } from "./components/DiaryDisplay";
import { DiaryList } from "./components/DiaryList";
import { ApiStatus } from "./components/ApiStatus";
import { AuthModal } from "./components/AuthModal";
import { Settings, RefreshCw, User, LogOut, Moon, Sun } from "lucide-react";
import { apiBaseUrl, publicAnonKey } from "./utils/supabase/info";
import { getUserId } from "./utils/userId";
import { useAuth } from "./contexts/AuthContext";
import { useTheme } from "./contexts/ThemeContext";

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
  const { user, userId, signIn, signUp, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentDiary, setCurrentDiary] =
    useState<DiaryEntry | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [showForm, setShowForm] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showApiStatus, setShowApiStatus] = useState(false);
  const [unsavedDiary, setUnsavedDiary] = useState<DiaryEntry | null>(null);
  const recoverTriedRef = useRef(false);
  const [language] = useState<Language>(() => {
    const stored = window.localStorage.getItem("deary_language") as Language | null;
    return stored === "en" || stored === "ko" ? stored : "ko";
  });

  const handleLanguageToggle = () => {
    const next: Language = language === "ko" ? "en" : "ko";
    window.localStorage.setItem("deary_language", next);
    window.location.reload();
  };

  // Load diaries on mount / when user changes
  useEffect(() => {
    recoverTriedRef.current = false;
    loadDiaries(true);
  }, [userId]);

  // 로그인 시 anonymousId에 저장된 일기를 user.id로 이전 (복구)
  useEffect(() => {
    if (!user || !apiBaseUrl) return;
    const anonymousId = getUserId();
    if (anonymousId === user.id) return; // 이미 동일 ID
    const migrate = async () => {
      try {
        const res = await fetch(
          `${apiBaseUrl}/diaries?userId=${encodeURIComponent(anonymousId)}`,
          { headers: { Authorization: `Bearer ${publicAnonKey}` } }
        );
        if (!res.ok) return;
        const { diaries: oldDiaries } = await res.json();
        if (!oldDiaries?.length) return;
        for (const d of oldDiaries) {
          await fetch(`${apiBaseUrl}/diaries`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ diary: d, userId: user.id }),
          });
          await fetch(
            `${apiBaseUrl}/diaries/${d.id}?userId=${encodeURIComponent(anonymousId)}`,
            { method: "DELETE", headers: { Authorization: `Bearer ${publicAnonKey}` } }
          );
        }
        await loadDiaries();
      } catch (e) {
        console.warn("Diary migration skipped:", e);
      }
    };
    migrate();
  }, [user?.id, apiBaseUrl]);

  // 로그인 시 미저장 일기 자동 저장
  useEffect(() => {
    if (!user || !unsavedDiary || !apiBaseUrl) return;
    const saveUnsaved = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/diaries`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ diary: unsavedDiary, userId }),
        });
        if (response.ok) {
          setUnsavedDiary(null);
          await loadDiaries();
        }
      } catch (e) {
        console.error("Error saving unsaved diary:", e);
      }
    };
    saveUnsaved();
  }, [user, unsavedDiary]);

  const loadDiaries = async (tryRecover = false) => {
    if (!user) {
      setDiaries([]);
      setIsLoading(false);
      return;
    }
    if (!apiBaseUrl) {
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/diaries?userId=${encodeURIComponent(userId)}`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data.diaries) ? data.diaries : [];
        if (list.length > 0) {
          setDiaries(list);
        } else if (tryRecover && !recoverTriedRef.current) {
          recoverTriedRef.current = true;
          const res = await fetch(
            `${apiBaseUrl}/diaries-recover?userId=${encodeURIComponent(userId)}`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${publicAnonKey}` },
            }
          );
          if (res.ok) {
            const { migrated } = await res.json();
            if (migrated > 0) await loadDiaries(false);
            else setDiaries([]);
          } else {
            setDiaries([]);
          }
        } else {
          setDiaries([]);
        }
      } else {
        console.warn("Diaries API error:", response.status, await response.text());
      }
    } catch (error) {
      console.error("Error loading diaries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDiaryGenerated = async (diary: DiaryEntry) => {
    if (!user) {
      setCurrentDiary(diary);
      setUnsavedDiary(diary);
      setShowForm(false);
      return;
    }
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
        body: JSON.stringify({ diary, userId }),
      });

      if (response.ok) {
        setCurrentDiary(diary);
        setUnsavedDiary(null);
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
    setUnsavedDiary(null);
  };

  const handleSelectDiary = (diary: DiaryEntry) => {
    setCurrentDiary(diary);
    setShowForm(false);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    recoverTriedRef.current = false;
    loadDiaries(true);
  };

  const handleDeleteDiary = async (diaryId: string) => {
    if (!apiBaseUrl) return;
    try {
      const response = await fetch(`${apiBaseUrl}/diaries/${diaryId}?userId=${encodeURIComponent(userId)}`, {
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

  const handleDeleteDiaries = async (diaryIds: string[]) => {
    if (!apiBaseUrl || diaryIds.length === 0) return;
    try {
      await Promise.all(
        diaryIds.map((id) =>
          fetch(`${apiBaseUrl}/diaries/${id}?userId=${encodeURIComponent(userId)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          })
        )
      );
      if (diaryIds.includes(currentDiary?.id ?? "")) {
        setCurrentDiary(null);
        setShowForm(true);
      }
      await loadDiaries();
    } catch (error) {
      console.error("Error deleting diaries:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900 transition-colors">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <img
                src="/deary-logo.png"
                alt="Deary"
                className="h-16 w-auto object-contain"
              />
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-amber-900 dark:text-amber-100">
                  Deary
                </h1>
                <p className="text-amber-700 dark:text-amber-300 text-sm md:text-base">
                  {language === "ko"
                    ? "몇 가지 질문에 답하면 AI가 당신만의 일기를 작성해드립니다"
                    : "Answer a few questions and AI will write a diary just for you."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                title={language === "ko" ? (theme === "dark" ? "라이트 모드" : "다크 모드") : (theme === "dark" ? "Light mode" : "Dark mode")}
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400 max-w-[120px] truncate">
                    {user.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="p-2 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                    title={language === "ko" ? "로그아웃" : "Sign out"}
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="p-2 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                  title={language === "ko" ? "로그인" : "Sign in"}
                >
                  <User className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
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
                className="px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-700 bg-white/70 dark:bg-stone-800/70 text-sm text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-stone-700/70 transition"
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
                className="p-2 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
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
              onDeleteDiary={handleDeleteDiary}
              onDeleteDiaries={handleDeleteDiaries}
              isLoading={isLoading}
              language={language}
              isLoggedIn={!!user}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {showForm ? (
              <div className="space-y-4">
                {!user && (
                  <div className="bg-amber-50/80 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-2 text-center">
                    <p className="text-amber-800 dark:text-amber-200 text-sm">
                      {language === "ko"
                        ? "로그인하면 일기가 저장됩니다. 먼저 체험해보세요!"
                        : "Log in to save your diaries. Try it out first!"}
                    </p>
                  </div>
                )}
                <QuestionForm
                  language={language}
                  onDiaryGenerated={handleDiaryGenerated}
                />
              </div>
            ) : (
              currentDiary && (
                <DiaryDisplay
                  diary={currentDiary}
                  onWriteNew={handleWriteNew}
                  language={language}
                  isUnsaved={!!unsavedDiary}
                  onLoginClick={() => setShowAuthModal(true)}
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

        {/* Auth Modal */}
        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            language={language}
            onSignIn={signIn}
            onSignUp={signUp}
          />
        )}
      </div>
    </div>
  );
}
