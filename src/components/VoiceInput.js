import MicButton from "./MicButton";

/**
 * Text input with an optional mic button suffix.
 * Pass {value, onChange, ...}. Voice input replaces or appends based on `mode`.
 */
export default function VoiceInput({
  value,
  onChange,
  placeholder = "",
  mode = "replace", // "replace" | "append"
  className = "",
  inputClassName = "",
  ...rest
}) {
  const handleTranscript = (text) => {
    if (!text) return;
    if (mode === "append") {
      const sep = value && !/[\s,.;!?]$/.test(value) ? " " : "";
      onChange(`${value || ""}${sep}${text}`);
    } else {
      onChange(text);
    }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-gray-300 px-3 py-2 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-brand-500 ${inputClassName}`}
        {...rest}
      />
      <div className="absolute right-1.5">
        <MicButton onTranscript={handleTranscript} />
      </div>
    </div>
  );
}
