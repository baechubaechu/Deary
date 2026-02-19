import { Calendar, Edit3 } from "lucide-react";
import type { DiaryEntry, Language } from "../App";

interface DiaryDisplayProps {
  diary: DiaryEntry;
  onWriteNew: () => void;
  language?: Language;
}

export function DiaryDisplay({
  diary,
  onWriteNew,
  language = "ko",
}: DiaryDisplayProps) {
  const t = {
    ko: {
      aiNote: "AI가 당신의 이야기로 작성한 일기입니다",
      writeNew: "새 일기 쓰기",
      myAnswers: "나의 답변",
      additionalAnswers: "추가 답변",
      mood: "오늘의 기분",
      highlight: "기억에 남는 순간",
      challenge: "어려웠던 점",
      grateful: "감사했던 일",
      tomorrow: "내일의 계획",
    },
    en: {
      aiNote: "This diary was written by AI based on your story",
      writeNew: "Write new diary",
      myAnswers: "My answers",
      additionalAnswers: "Additional answers",
      mood: "Mood today",
      highlight: "Memorable moment",
      challenge: "Challenges",
      grateful: "What I was grateful for",
      tomorrow: "Plans for tomorrow",
    },
  };
  const text = language === "en" ? t.en : t.ko;

  return (
    <div className="space-y-6">
      {/* Diary Card */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-2 text-gray-600 mb-6">
          <Calendar className="w-5 h-5" />
          <span className="text-sm">{diary.date}</span>
        </div>

        <div className="prose prose-lg max-w-none">
          <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {diary.content}
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500 italic">{text.aiNote}</p>
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
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {text.myAnswers}
        </h3>
        <div className="space-y-4">
          {diary.answers.mood && (
            <div>
              <p className="text-sm font-medium text-gray-600">{text.mood}</p>
              <p className="text-gray-800 mt-1">{diary.answers.mood}</p>
            </div>
          )}
          {diary.answers.highlight && (
            <div>
              <p className="text-sm font-medium text-gray-600">
                {text.highlight}
              </p>
              <p className="text-gray-800 mt-1">{diary.answers.highlight}</p>
            </div>
          )}
          {diary.answers.challenge && (
            <div>
              <p className="text-sm font-medium text-gray-600">
                {text.challenge}
              </p>
              <p className="text-gray-800 mt-1">{diary.answers.challenge}</p>
            </div>
          )}
          {diary.answers.grateful && (
            <div>
              <p className="text-sm font-medium text-gray-600">
                {text.grateful}
              </p>
              <p className="text-gray-800 mt-1">{diary.answers.grateful}</p>
            </div>
          )}
          {diary.answers.tomorrow && (
            <div>
              <p className="text-sm font-medium text-gray-600">
                {text.tomorrow}
              </p>
              <p className="text-gray-800 mt-1">{diary.answers.tomorrow}</p>
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
                  <p className="text-sm font-medium text-gray-600">
                    {text.additionalAnswers} {i + 1}
                  </p>
                  <p className="text-gray-800 mt-1">{value}</p>
                </div>
              ) : null
            )}
        </div>
      </div>
    </div>
  );
}
