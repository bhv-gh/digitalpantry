import { useCallback, useEffect, useRef, useState } from "react";

export default function useSpeechToText({ continuous = false, lang = "en-US" } = {}) {
  const SR =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);
  const supported = !!SR;
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const recRef = useRef(null);

  useEffect(
    () => () => {
      try {
        recRef.current?.stop();
      } catch {}
    },
    []
  );

  const start = useCallback(() => {
    if (!supported) {
      setError("Voice input isn't supported in this browser.");
      return;
    }
    try {
      setError(null);
      setTranscript("");
      const rec = new SR();
      rec.continuous = continuous;
      rec.interimResults = true;
      rec.lang = lang;
      rec.onresult = (e) => {
        const out = Array.from(e.results).map((r) => r[0].transcript).join("");
        setTranscript(out);
      };
      rec.onerror = (e) => setError(e.error || "Microphone error");
      rec.onend = () => setListening(false);
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch (e) {
      setError(e.message || "Unable to start voice input");
    }
  }, [SR, continuous, lang, supported]);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {}
    setListening(false);
  }, []);

  return { supported, listening, transcript, error, start, stop };
}
