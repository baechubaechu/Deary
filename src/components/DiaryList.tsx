import { Edit3, Calendar, Trash2 } from "lucide-react";
import type { DiaryEntry, Language } from "../App";

interface DiaryListProps {
  diaries: DiaryEntry[];
  currentDiaryId?: string;
  onSelectDiary: (diary: DiaryEntry) => void;
  onWriteNew: () => void;
  onDeleteDiary: (diaryId: string) => void;
  isLoading: boolean;
  language?: Language;
}

export function DiaryList({
  diaries,
  currentDiaryId,
  onSelectDiary,
  onWriteNew,
  onDeleteDiary,
  isLoading,
  language = "ko",
}: DiaryListProps) {
  const sortedDiaries = [...diaries].sort((a, b) => b.timestamp - a.timestamp);

  const t = {
    ko: {
      title: "내 일기",
      writeNew: "새 일기 쓰기",
      loading: "일기를 불러오는 중...",
      empty: "아직 작성한 일기가 없습니다",
      emptyHint: "첫 일기를 작성해보세요!",
      delete: "삭제",
      deleteConfirm: "이 일기를 삭제하시겠습니까?",
      defaultContent: "오늘의 일기",
    },
    en: {
      title: "My Diaries",
      writeNew: "Write new diary",
      loading: "Loading diaries...",
      empty: "No diaries yet",
      emptyHint: "Write your first diary!",
      delete: "Delete",
      deleteConfirm: "Are you sure you want to delete this diary?",
      defaultContent: "Today's diary",
    },
  };
  const text = language === "en" ? t.en : t.ko;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">{text.title}</h2>
        <button
          onClick={onWriteNew}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-2 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
          title={text.writeNew}
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500">{text.loading}</p>
        </div>
      ) : sortedDiaries.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">{text.empty}</p>
          <p className="text-gray-400 text-xs mt-1">{text.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {sortedDiaries.map((diary) => (
            <div
              key={diary.id}
              className={`group p-4 rounded-lg cursor-pointer transition-all border-2 ${
                currentDiaryId === diary.id
                  ? "border-amber-500 bg-amber-50"
                  : "border-transparent hover:bg-gray-50"
              }`}
            >
              <div
                onClick={() => onSelectDiary(diary)}
                className="flex-1"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-600">{diary.date}</span>
                </div>
                <p className="text-sm text-gray-800 line-clamp-2">
                  {diary.content || text.defaultContent}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(text.deleteConfirm)) {
                    onDeleteDiary(diary.id);
                  }
                }}
                className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                {text.delete}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
