import { PenLine } from "lucide-react";
import type { DiaryEntry } from "../App";

interface DiaryDisplayProps {
  diary: DiaryEntry;
  onWriteNew: () => void;
}

export function DiaryDisplay({ diary, onWriteNew }: DiaryDisplayProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-amber-100">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-gray-500">{diary.date}</span>
        <button
          onClick={onWriteNew}
          className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-xl hover:bg-amber-200 transition"
        >
          <PenLine className="w-4 h-4" />
          새 일기 쓰기
        </button>
      </div>

      <div className="prose prose-amber max-w-none">
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
          {diary.content}
        </p>
      </div>

      {diary.answers && (
        <div className="mt-6 pt-6 border-t border-amber-100 space-y-3">
          <h4 className="font-semibold text-amber-800 mb-2">오늘의 답변</h4>
          <div className="grid gap-2 text-sm">
            {diary.answers.mood && (
              <p>
                <span className="text-amber-600 font-medium">기분: </span>
                {diary.answers.mood}
              </p>
            )}
            {diary.answers.highlight && (
              <p>
                <span className="text-amber-600 font-medium">하이라이트: </span>
                {diary.answers.highlight}
              </p>
            )}
            {diary.answers.grateful && (
              <p>
                <span className="text-amber-600 font-medium">감사한 것: </span>
                {diary.answers.grateful}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
