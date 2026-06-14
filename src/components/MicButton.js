import { useEffect, useRef } from "react";
import useSpeechToText from "../hooks/useSpeechToText";
import { MicIcon } from "./icons";

/**
 * onTranscript(finalText) is called when the user stops recording.
 */
export default function MicButton({ onTranscript, className = "" }) {
  const { supported, listening, transcript, error, start, stop } = useSpeechToText();
  const lastSent = useRef("");

  useEffect(() => {
    if (!listening && transcript && transcript !== lastSent.current) {
      lastSent.current = transcript;
      onTranscript?.(transcript.trim());
    }
  }, [listening, transcript, onTranscript]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      className={`inline-flex items-center justify-center rounded-full w-9 h-9 transition-colors ${
        listening
          ? "bg-red-500 text-white animate-pulse"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      } ${className}`}
      aria-label={listening ? "Stop voice input" : "Start voice input"}
      title={error || (listening ? "Listening…" : "Voice input")}
    >
      <MicIcon className="w-4 h-4" />
    </button>
  );
}
