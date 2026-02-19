import { useState } from "react";
import { Send, Mic } from "lucide-react";
import type { DiaryEntry } from "../App";

interface QuestionFormProps {
  onDiaryGenerated: (diary: DiaryEntry) => void;
}

export function QuestionForm({ onDiaryGenerated }: QuestionFormProps) {
  const [answer, setAnswer] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const diary: DiaryEntry = {
      id: `dummy-${Date.now()}`,
      date: new Date().toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      }),
      content: answer || "오늘 하루를 간단히 기록했습니다.",
      answers: {
        mood: answer || "평온함",
        highlight: "일기 작성",
        challenge: "없음",
        grateful: "건강한 하루",
        tomorrow: "좋은 하루 되길",
      },
      timestamp: Date.now(),
    };
    onDiaryGenerated(diary);
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-amber-100 min-h-[400px] flex flex-col">
      <div className="flex-1 mb-6">
        <div className="flex justify-start">
          <div className="bg-amber-50 p-4 rounded-2xl rounded-tl-none shadow-sm max-w-[80%] text-gray-700 border border-amber-100">
            오늘 아침에는 어떻게 시작하셨나요? 특별한 기분이 들었나요?
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="답변을 입력하거나 마이크 버튼을 눌러 말씀해주세요"
          rows={3}
          className="w-full p-4 bg-white/90 border border-amber-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-300 transition resize-none shadow-inner text-gray-700"
        />
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-amber-500 transition rounded-lg hover:bg-amber-50"
            title="음성 입력"
          >
            <Mic className="w-5 h-5" />
          </button>
          <button
            type="submit"
            className="bg-amber-400 text-white px-4 py-2 rounded-xl hover:bg-amber-500 transition flex items-center gap-2"
          >
            전송 <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
