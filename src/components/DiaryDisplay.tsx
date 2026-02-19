import { Calendar, Edit3, Volume2, Square } from "lucide-react";
import type { DiaryEntry, Language } from "../App";
import { useTTS } from "../hooks/useTTS";

interface DiaryDisplayProps {
  diary: DiaryEntry;
  onWriteNew: () => void;
  language?: Language;
  isUnsaved?: boolean;
  onLoginClick?: () => void;
}

export function DiaryDisplay({
  diary,
  onWriteNew,
  language = "ko",
  isUnsaved,
  onLoginClick,
}: DiaryDisplayProps) {
  const t = {
    ko: {
      aiNote: "AI가 당신의 이야기로 작성한 일기입니다",
      unsavedBanner: "저장되지 않은 일기입니다. 로그인하면 저장할 수 있어요.",
      loginToSave: "로그인하여 저장",
      writeNew: "새 일기 쓰기",
      myAnswers: "나의 답변",
      additionalAnswers: "추가 답변",
      mood: "오늘의 기분",
      highlight: "기억에 남는 순간",
      challenge: "어려웠던 점",
      grateful: "감사했던 일",
      tomorrow: "내일의 계획",
      readAloud: "읽어주기",
      stopReading: "읽기 중지",
    },
    en: {
      aiNote: "This diary was written by AI based on your story",
      unsavedBanner: "This diary is not saved. Log in to save it.",
      loginToSave: "Log in to save",
      writeNew: "Write new diary",
      myAnswers: "My answers",
      additionalAnswers: "Additional answers",
      mood: "Mood today",
      highlight: "Memorable moment",
      challenge: "Challenges",
      grateful: "What I was grateful for",
      tomorrow: "Plans for tomorrow",
      readAloud: "Read aloud",
      stopReading: "Stop reading",
    },
  };
  const text = language === "en" ? t.en : t.ko;
  const { speak, stop, isSpeaking } = useTTS(language);

  const handleReadAloud = () => {
    if (isSpeaking) {
      stop();
    } else {
      speak(diary.content);
    }
  };

  return (
    <div className="space-y-6">
      {isUnsaved && onLoginClick && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-200 dark:border-amber-700 rounded-2xl p-4 flex items-center justify-between gap-4">
          <p className="text-amber-800 dark:text-amber-200 text-sm">{text.unsavedBanner}</p>
          <button
            onClick={onLoginClick}
            className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium py-2 px-4 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
          >
            {text.loginToSave}
          </button>
        </div>
      )}
      {/* Diary Card */}
      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl p-8 border border-transparent dark:border-stone-700">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Calendar className="w-5 h-5" />
            <span className="text-sm">{diary.date}</span>
          </div>
          <button
            onClick={handleReadAloud}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isSpeaking
                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                : "bg-gray-100 dark:bg-stone-700 text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400"
            }`}
          >
            {isSpeaking ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                {text.stopReading}
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                {text.readAloud}
              </>
            )}
          </button>
        </div>

        <div className="prose prose-lg max-w-none dark:prose-invert">
          <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            {diary.content}
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-stone-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">{text.aiNote}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onWriteNew}
          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
        >
          <Edit3 className="w-5 h-5" />
          {text.writeNew}
        </button>
      </div>

      {/* Your Answers Section */}
      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl p-8 border border-transparent dark:border-stone-700">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {text.myAnswers}
        </h3>
        <div className="space-y-4">
          {diary.answers.mood && (
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{text.mood}</p>
              <p className="text-gray-800 dark:text-gray-200 mt-1">{diary.answers.mood}</p>
            </div>
          )}
          {diary.answers.highlight && (
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {text.highlight}
              </p>
              <p className="text-gray-800 dark:text-gray-200 mt-1">{diary.answers.highlight}</p>
            </div>
          )}
          {diary.answers.challenge && (
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {text.challenge}
              </p>
              <p className="text-gray-800 dark:text-gray-200 mt-1">{diary.answers.challenge}</p>
            </div>
          )}
          {diary.answers.grateful && (
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {text.grateful}
              </p>
              <p className="text-gray-800 dark:text-gray-200 mt-1">{diary.answers.grateful}</p>
            </div>
          )}
          {diary.answers.tomorrow && (
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {text.tomorrow}
              </p>
              <p className="text-gray-800 dark:text-gray-200 mt-1">{diary.answers.tomorrow}</p>
            </div>
          )}
          {Object.entries(diary.answers)
            .filter(
              ([k]) =>
                !["mood", "highlight", "challenge", "grateful", "tomorrow"].includes(k)
            )
            .map(([key, value], i) =>
              value ? (
                <div key={key}>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {text.additionalAnswers} {i + 1}
                  </p>
                  <p className="text-gray-800 dark:text-gray-200 mt-1">{value}</p>
                </div>
              ) : null
            )}
        </div>
      </div>
    </div>
  );
}
