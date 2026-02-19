import { PenLine, Trash2, Loader2 } from "lucide-react";
import type { DiaryEntry } from "../App";

interface DiaryListProps {
  diaries: DiaryEntry[];
  currentDiaryId?: string;
  onSelectDiary: (diary: DiaryEntry) => void;
  onWriteNew: () => void;
  onDeleteDiary: (diaryId: string) => void;
  isLoading: boolean;
}

export function DiaryList({
  diaries,
  currentDiaryId,
  onSelectDiary,
  onWriteNew,
  onDeleteDiary,
  isLoading,
}: DiaryListProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-amber-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">내 일기</h2>
        <button
          onClick={onWriteNew}
          className="p-2 bg-amber-400 text-white rounded-lg hover:bg-amber-500 transition"
          title="새 일기 쓰기"
        >
          <PenLine className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-amber-600">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : diaries.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            아직 작성된 일기가 없습니다.
          </div>
        ) : (
          diaries.map((diary) => (
            <div
              key={diary.id}
              className={`p-4 rounded-xl border cursor-pointer transition group ${
                currentDiaryId === diary.id
                  ? "bg-amber-50 border-amber-300 shadow-sm"
                  : "bg-white/50 border-amber-100 hover:border-amber-200"
              }`}
              onClick={() => onSelectDiary(diary)}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-500 block">
                    {diary.date}
                  </span>
                  <p className="text-sm text-gray-700 font-medium mt-1 line-clamp-2">
                    {diary.content || "오늘의 일기"}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteDiary(diary.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition rounded"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
