import { useState } from "react";
import { Pencil, Calendar, Trash2, X, Square, CheckSquare } from "lucide-react";
import type { DiaryEntry, Language } from "../App";

interface DiaryListProps {
  diaries: DiaryEntry[];
  currentDiaryId?: string;
  onSelectDiary: (diary: DiaryEntry) => void;
  onDeleteDiary: (diaryId: string) => void;
  onDeleteDiaries: (diaryIds: string[]) => void;
  isLoading: boolean;
  language?: Language;
  isLoggedIn?: boolean;
}

export function DiaryList({
  diaries,
  currentDiaryId,
  onSelectDiary,
  onDeleteDiary,
  onDeleteDiaries,
  isLoading,
  language = "ko",
  isLoggedIn = true,
}: DiaryListProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const sortedDiaries = [...diaries]
    .filter((d) => d && (d.id || d.timestamp != null))
    .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

  const t = {
    ko: {
      title: "내 일기",
      editMode: "편집",
      cancelEdit: "취소",
      deleteSelected: "선택 삭제",
      deleteSelectedConfirm: "선택한 일기 {count}개를 삭제하시겠습니까?",
      selectAll: "전체 선택",
      deselectAll: "선택 해제",
      loading: "일기를 불러오는 중...",
      empty: "아직 작성한 일기가 없습니다",
      emptyHint: "첫 일기를 작성해보세요!",
      loginHint: "로그인하면 일기가 저장됩니다",
      delete: "삭제",
      deleteConfirm: "이 일기를 삭제하시겠습니까?",
      defaultContent: "오늘의 일기",
    },
    en: {
      title: "My Diaries",
      editMode: "Edit",
      cancelEdit: "Cancel",
      deleteSelected: "Delete selected",
      deleteSelectedConfirm: "Delete {count} selected diary/diaries?",
      selectAll: "Select all",
      deselectAll: "Deselect all",
      loading: "Loading diaries...",
      empty: "No diaries yet",
      emptyHint: "Write your first diary!",
      loginHint: "Log in to save your diaries",
      delete: "Delete",
      deleteConfirm: "Are you sure you want to delete this diary?",
      defaultContent: "Today's diary",
    },
  };
  const text = language === "en" ? t.en : t.ko;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedDiaries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedDiaries.map((d) => d.id)));
    }
  };

  const handleDeleteSelected = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const msg = text.deleteSelectedConfirm.replace("{count}", String(ids.length));
    if (confirm(msg)) {
      onDeleteDiaries(ids);
      setSelectedIds(new Set());
      setIsEditMode(false);
    }
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl p-6 sticky top-8 border border-transparent dark:border-stone-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{text.title}</h2>
        {sortedDiaries.length > 0 && (
          <button
            onClick={() => (isEditMode ? exitEditMode() : setIsEditMode(true))}
            className={`p-2 rounded-lg transition-all ${
              isEditMode
                ? "bg-gray-200 dark:bg-stone-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-stone-500"
                : "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
            }`}
            title={isEditMode ? text.cancelEdit : text.editMode}
          >
            {isEditMode ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          </button>
        )}
      </div>

      {isEditMode && sortedDiaries.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={toggleSelectAll}
            className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
          >
            {selectedIds.size === sortedDiaries.length ? text.deselectAll : text.selectAll}
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all"
          >
            <Trash2 className="w-4 h-4" />
            {text.deleteSelected} {selectedIds.size > 0 && `(${selectedIds.size})`}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{text.loading}</p>
        </div>
      ) : sortedDiaries.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">{text.empty}</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{text.emptyHint}</p>
          {!isLoggedIn && (
            <p className="text-amber-600 dark:text-amber-400 text-xs mt-2 font-medium">{text.loginHint}</p>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {sortedDiaries.map((diary) => (
            <div
              key={diary.id}
              className={`group p-4 rounded-lg transition-all border-2 flex items-start gap-3 ${
                isEditMode
                  ? selectedIds.has(diary.id)
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-600"
                    : "border-transparent hover:bg-gray-50 dark:hover:bg-stone-700/50"
                  : currentDiaryId === diary.id
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-600"
                    : "border-transparent hover:bg-gray-50 dark:hover:bg-stone-700/50"
              } ${!isEditMode ? "cursor-pointer" : ""}`}
            >
              {isEditMode ? (
                <button
                  type="button"
                  onClick={() => toggleSelect(diary.id)}
                  className="shrink-0 mt-0.5 p-0.5 rounded focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {selectedIds.has(diary.id) ? (
                    <CheckSquare className="w-5 h-5 text-amber-600 dark:text-amber-400 fill-amber-600 dark:fill-amber-400" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  )}
                </button>
              ) : null}
              <div
                onClick={() => !isEditMode && onSelectDiary(diary)}
                className="flex-1 min-w-0"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{diary.date}</span>
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                  {diary.content || text.defaultContent}
                </p>
              </div>
              {!isEditMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(text.deleteConfirm)) {
                      onDeleteDiary(diary.id);
                    }
                  }}
                  className="shrink-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  {text.delete}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
