import { useState } from "react";
import { runOcr, findExpiryDate } from "../lib/ocr";
import { CameraIcon, SparkIcon } from "./icons";

/**
 * Renders a hidden file/camera input + a button.
 * When user picks an image, runs OCR and calls onResult({ text, expiry }).
 */
export default function OcrCapture({
  onResult,
  mode = "expiry", // "expiry" or "label"
  label,
  className = "",
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const inputId = `ocr-input-${mode}`;

  const handlePick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setBusy(true);
    setProgress(0);
    try {
      const text = await runOcr(file, (m) => {
        if (m.status === "recognizing text" && typeof m.progress === "number") {
          setProgress(Math.round(m.progress * 100));
        }
      });
      const expiry = mode === "expiry" ? findExpiryDate(text) : null;
      onResult?.({ text, expiry });
    } catch (err) {
      setError(err.message || "OCR failed");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className={className}>
      <label
        htmlFor={inputId}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-sm cursor-pointer ${
          busy ? "opacity-60 pointer-events-none" : "hover:bg-gray-50"
        }`}
      >
        {busy ? <SparkIcon className="w-4 h-4 animate-spin" /> : <CameraIcon className="w-4 h-4" />}
        <span>
          {busy
            ? `Reading… ${progress}%`
            : label || (mode === "expiry" ? "Scan expiry date" : "Scan label")}
        </span>
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePick}
        className="hidden"
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
