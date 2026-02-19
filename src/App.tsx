import { useState, useEffect } from "react";
import { QuestionForm } from "./components/QuestionForm";
import { DiaryDisplay } from "./components/DiaryDisplay";
import { DiaryList } from "./components/DiaryList";
import { ApiStatus } from "./components/ApiStatus";
import { BookOpen, Settings } from "lucide-react";
import {
  projectId,
  publicAnonKey,
} from "./utils/supabase/info";

export interface DiaryAnswers {
  mood: string;
  highlight: string;
  challenge: string;
  grateful: string;
  tomorrow: string;
}

export interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  answers: DiaryAnswers;
  timestamp: number;
}

export default function App() {
  const [currentDiary, setCurrentDiary] =
    useState<DiaryEntry | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [showForm, setShowForm] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showApiStatus, setShowApiStatus] = useState(false);

  // Load diaries on mount
  useEffect(() => {
    loadDiaries();
  }, []);

  const loadDiaries = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dd0ac201/diaries`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );

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
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dd0ac201/diaries`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ diary }),
        },
      );

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

  const handleDeleteDiary = async (diaryId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-dd0ac201/diaries/${diaryId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );

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
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <BookOpen className="w-10 h-10 text-amber-600" />
            <h1 className="text-4xl font-bold text-amber-900">
              AI 일기장
            </h1>
            <button
              onClick={() => setShowApiStatus(true)}
              className="ml-2 p-2 text-gray-400 hover:text-amber-600 transition-colors"
              title="API 연결 상태 확인"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>
          <p className="text-amber-700">
            몇 가지 질문에 답하면 AI가 당신만의 일기를
            작성해드립니다
          </p>
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
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {showForm ? (
              <QuestionForm
                onDiaryGenerated={handleDiaryGenerated}
              />
            ) : (
              currentDiary && (
                <DiaryDisplay
                  diary={currentDiary}
                  onWriteNew={handleWriteNew}
                />
              )
            )}
          </div>
        </div>

        {/* API Status Modal */}
        {showApiStatus && (
          <ApiStatus onClose={() => setShowApiStatus(false)} />
        )}
      </div>
    </div>
  );
}
