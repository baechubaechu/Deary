import { useState } from "react";
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react";
import { apiBaseUrl, publicAnonKey } from "../utils/supabase/info";
import type { Language } from "../App";

interface ApiStatusProps {
  onClose: () => void;
  language?: Language;
}

export function ApiStatus({ onClose, language = "ko" }: ApiStatusProps) {
  const [testStatus, setTestStatus] = useState<{
    testing: boolean;
    success: boolean;
    message: string;
  }>({
    testing: false,
    success: false,
    message: "",
  });

  const testConnection = async () => {
    setTestStatus({ testing: true, success: false, message: "" });

    try {
      const testResponse = await fetch(`${apiBaseUrl}/test-gemini`, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      const responseText = await testResponse.text();
      let testData: { success?: boolean; error?: string; availableModels?: string[] };
      try {
        testData = JSON.parse(responseText);
      } catch {
        setTestStatus({
          testing: false,
          success: false,
          message:
            language === "ko"
              ? `서버 응답 파싱 실패: ${responseText.substring(0, 100)}`
              : `Failed to parse response: ${responseText.substring(0, 100)}`,
        });
        return;
      }

      if (testData.success) {
        const models = testData.availableModels?.length
          ? ` (${testData.availableModels.length} models)`
          : "";
        setTestStatus({
          testing: false,
          success: true,
          message:
            language === "ko"
              ? `✅ Gemini API 연결 성공!${models}`
              : `✅ Gemini API connected!${models}`,
        });
      } else {
        setTestStatus({
          testing: false,
          success: false,
          message: `❌ ${language === "ko" ? "API 연결 실패" : "API connection failed"}: ${testData.error || "Unknown error"}`,
        });
      }
    } catch (error) {
      setTestStatus({
        testing: false,
        success: false,
        message: `${
          language === "ko" ? "연결 테스트 실패" : "Connection test failed"
        }: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  };

  const t = {
    ko: {
      title: "API 연결 상태 확인",
      desc: "Gemini API가 올바르게 설정되어 있는지 확인합니다",
      test: "연결 테스트",
      retry: "다시 테스트",
      close: "닫기",
      apiKeyTitle: "API 키 설정 방법:",
      step1: "https://aistudio.google.com/app/apikey 방문",
      step2: '"Create API Key" 클릭',
      step3: "생성된 키를 복사",
      step4: "Supabase 설정에서 GEMINI_API_KEY에 붙여넣기",
    },
    en: {
      title: "API connection status",
      desc: "Verify that the Gemini API is configured correctly",
      test: "Test connection",
      retry: "Retry",
      close: "Close",
      apiKeyTitle: "How to set up API key:",
      step1: "Visit https://aistudio.google.com/app/apikey",
      step2: 'Click "Create API Key"',
      step3: "Copy the generated key",
      step4: "Paste it into GEMINI_API_KEY in Supabase settings",
    },
  };
  const text = language === "en" ? t.en : t.ko;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl p-6 max-w-md w-full border border-transparent dark:border-stone-700">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
          {text.title}
        </h3>

        {!testStatus.testing && !testStatus.message && (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">{text.desc}</p>
            <button
              onClick={testConnection}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-5 h-5" />
              {text.test}
            </button>
          </div>
        )}

        {testStatus.testing && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              {language === "ko" ? "테스트 중..." : "Testing..."}
            </p>
          </div>
        )}

        {!testStatus.testing && testStatus.message && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-stone-700/50 rounded-lg">
              {testStatus.success ? (
                <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {testStatus.message}
                </p>
              </div>
            </div>

            {!testStatus.success && (
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                  {text.apiKeyTitle}
                </p>
                <ol className="list-decimal list-inside text-blue-800 dark:text-blue-300 space-y-1">
                  <li>{text.step1}</li>
                  <li>{text.step2}</li>
                  <li>{text.step3}</li>
                  <li>{text.step4}</li>
                </ol>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={testConnection}
                className="flex-1 bg-gray-100 dark:bg-stone-700 text-gray-700 dark:text-gray-300 font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-stone-600 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {text.retry}
              </button>
              <button
                onClick={onClose}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-2 px-4 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
              >
                {text.close}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
