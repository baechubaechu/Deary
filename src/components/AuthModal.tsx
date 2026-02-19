import { useState } from "react";
import { X } from "lucide-react";
import type { Language } from "../App";

interface AuthModalProps {
  onClose: () => void;
  language?: Language;
  onSignIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  onSignUp: (email: string, password: string) => Promise<{ error: Error | null }>;
}

export function AuthModal({
  onClose,
  language = "ko",
  onSignIn,
  onSignUp,
}: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const t = {
    ko: {
      title: "로그인",
      signUpTitle: "회원가입",
      email: "이메일",
      password: "비밀번호",
      signIn: "로그인",
      signUp: "가입하기",
      switchToSignUp: "계정이 없으신가요? 가입하기",
      switchToSignIn: "이미 계정이 있으신가요? 로그인",
      signUpSuccess: "가입 완료! 이메일을 확인해주세요.",
      passwordConfirm: "비밀번호 확인",
      passwordMismatch: "비밀번호가 일치하지 않습니다.",
      close: "닫기",
    },
    en: {
      title: "Sign in",
      signUpTitle: "Sign up",
      email: "Email",
      password: "Password",
      signIn: "Sign in",
      signUp: "Sign up",
      switchToSignUp: "Don't have an account? Sign up",
      switchToSignIn: "Already have an account? Sign in",
      signUpSuccess: "Signed up! Please check your email.",
      passwordConfirm: "Confirm password",
      passwordMismatch: "Passwords do not match.",
      close: "Close",
    },
  };
  const text = language === "en" ? t.en : t.ko;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (mode === "signin") {
      const { error } = await onSignIn(email, password);
      if (error) {
        setError(error.message);
      } else {
        onClose();
      }
    } else {
      if (password !== passwordConfirm) {
        setError(text.passwordMismatch);
        setLoading(false);
        return;
      }
      const { error } = await onSignUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setSuccess(text.signUpSuccess);
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-xl p-6 max-w-md w-full relative border border-transparent dark:border-stone-700">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
          {mode === "signin" ? text.title : text.signUpTitle}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {text.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-200 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {text.password}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-200 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {text.passwordConfirm}
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={6}
                placeholder={language === "ko" ? "비밀번호를 다시 입력하세요" : "Re-enter your password"}
                className="w-full px-4 py-2 border border-gray-200 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          )}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600">{success}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold py-3 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
          >
            {loading ? "..." : mode === "signin" ? text.signIn : text.signUp}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setSuccess("");
            setPasswordConfirm("");
          }}
          className="mt-4 w-full text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
        >
          {mode === "signin" ? text.switchToSignUp : text.switchToSignIn}
        </button>
      </div>
    </div>
  );
}
