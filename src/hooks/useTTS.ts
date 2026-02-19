import { useState, useCallback, useRef, useEffect } from "react";
import { apiBaseUrl, publicAnonKey } from "../utils/supabase/info";

const TTS_ENABLED_KEY = "deary_tts_enabled";

function selectBestVoice(
  voices: SpeechSynthesisVoice[],
  lang: "ko-KR" | "en-US"
): SpeechSynthesisVoice | null {
  const langPrefix = lang.startsWith("ko") ? "ko" : "en";
  const matching = voices.filter((v) => v.lang.startsWith(langPrefix));

  // 우선: Google, Microsoft, Samsung 등 프리미엄 음성 (더 자연스러움)
  const premium = matching.filter(
    (v) =>
      v.name.includes("Google") ||
      v.name.includes("Microsoft") ||
      v.name.includes("Samsung") ||
      v.name.includes("Premium")
  );
  if (premium.length > 0) return premium[0];

  // 차선: 해당 언어 기본 음성
  const defaultVoice = matching.find((v) => v.default);
  if (defaultVoice) return defaultVoice;

  return matching[0] ?? null;
}

export function useTTS(language: "ko" | "en") {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEnabled, setIsEnabled] = useState(() => {
    const stored = localStorage.getItem(TTS_ENABLED_KEY);
    return stored !== "false";
  });
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synthRef.current = synth;

    const loadVoices = () => {
      voicesRef.current = synth.getVoices();
    };
    loadVoices();
    synth.onvoiceschanged = loadVoices;

    return () => {
      synth.cancel();
      synth.onvoiceschanged = null;
      audioRef.current?.pause();
    };
  }, []);

  const speakWithWebTTS = useCallback(
    (text: string) => {
      if (!synthRef.current) return;
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text.trim());
      const lang = language === "en" ? "en-US" : "ko-KR";
      utterance.lang = lang;
      const voice = selectBestVoice(voicesRef.current, lang);
      if (voice) utterance.voice = voice;
      utterance.rate = 0.88;
      utterance.pitch = 1.02;
      utterance.volume = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      synthRef.current.speak(utterance);
    },
    [language]
  );

  const speak = useCallback(
    async (text: string) => {
      if (!isEnabled || !text.trim()) return;

      synthRef.current?.cancel();
      audioRef.current?.pause();

      if (apiBaseUrl && publicAnonKey) {
        try {
          const res = await fetch(`${apiBaseUrl}/tts`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${publicAnonKey}`,
            },
            body: JSON.stringify({ text: text.trim(), language }),
          });
          if (res.ok) {
            const blob = await res.blob();
            if (blob.size === 0) {
              console.warn("TTS: empty audio response, fallback to Web TTS");
              speakWithWebTTS(text);
              return;
            }
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => {
              URL.revokeObjectURL(url);
              setIsSpeaking(false);
            };
            audio.onerror = (e) => {
              console.warn("TTS playback error:", e);
              URL.revokeObjectURL(url);
              setIsSpeaking(false);
            };
            setIsSpeaking(true);
            await audio.play().catch((err) => {
              console.warn("TTS play() failed:", err);
              URL.revokeObjectURL(url);
              setIsSpeaking(false);
              speakWithWebTTS(text);
            });
            return;
          } else {
            const errText = await res.text();
            console.warn("TTS API error:", res.status, errText);
          }
        } catch (e) {
          console.warn("TTS fetch error:", e);
        }
      }

      speakWithWebTTS(text);
    },
    [isEnabled, language, speakWithWebTTS]
  );

  const stop = useCallback(() => {
    synthRef.current?.cancel();
    audioRef.current?.pause();
    audioRef.current = null;
    setIsSpeaking(false);
  }, []);

  const toggleEnabled = useCallback(() => {
    const next = !isEnabled;
    setIsEnabled(next);
    localStorage.setItem(TTS_ENABLED_KEY, String(next));
    if (!next) stop();
  }, [isEnabled, stop]);

  return { speak, stop, isSpeaking, isEnabled, toggleEnabled };
}
