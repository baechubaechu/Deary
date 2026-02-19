import { X, Wifi, AlertCircle } from "lucide-react";

interface ApiStatusProps {
  onClose: () => void;
}

export function ApiStatus({ onClose }: ApiStatusProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-gray-800 mb-4">
          API 연결 상태
        </h3>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <Wifi className="w-6 h-6 text-amber-500" />
            <div>
              <p className="font-medium text-gray-700">Supabase Edge Function</p>
              <p className="text-sm text-gray-500">
                projectId와 publicAnonKey를 설정해주세요.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
            <AlertCircle className="w-6 h-6 text-gray-400" />
            <div>
              <p className="font-medium text-gray-700">설정 위치</p>
              <p className="text-sm text-gray-500">
                src/utils/supabase/info.ts
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 bg-amber-400 text-white rounded-xl hover:bg-amber-500 transition font-medium"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
