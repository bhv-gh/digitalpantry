import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

const READER_ID = "qr-reader";

/**
 * Barcode/QR scanner using html5-qrcode (ZXing).
 * Calls onDetected(code) once when a barcode is read.
 * Provides a manual-entry fallback.
 */
export default function BarcodeScanner({ onDetected, onCancel }) {
  const scannerRef = useRef(null);
  const onDetectedRef = useRef(onDetected);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(true);
  const [manual, setManual] = useState("");

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let cancelled = false;

    const scanConfig = {
      fps: 10,
      qrbox: (w, h) => {
        const min = Math.min(w, h);
        const width = Math.floor(min * 0.85);
        const height = Math.floor(min * 0.5);
        return { width, height };
      },
      aspectRatio: 1.333,
    };

    const onScanSuccess = (scanner) => (decodedText) => {
      if (cancelled) return;
      cancelled = true;
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {})
        .finally(() => onDetectedRef.current?.(decodedText));
    };

    async function tryStart(constraint) {
      const scanner = new Html5Qrcode(READER_ID, /* verbose */ false);
      scannerRef.current = scanner;
      await scanner.start(constraint, scanConfig, onScanSuccess(scanner), () => {});
      return scanner;
    }

    async function init() {
      try {
        // First try the rear camera (preferred on phones).
        try {
          await tryStart({ facingMode: "environment" });
        } catch (e1) {
          if (cancelled) return;
          // Fallback: pick any available camera (works on laptops / front-only).
          const cams = await Html5Qrcode.getCameras();
          if (!cams || !cams.length) throw e1;
          const back = cams.find((c) => /back|rear|environment/i.test(c.label));
          await tryStart((back || cams[0]).id);
        }
        if (!cancelled) setStarting(false);
      } catch (e) {
        if (cancelled) return;
        setStarting(false);
        const msg = e?.message || String(e) || "Camera unavailable";
        if (/permission|notallowed|denied/i.test(msg)) {
          setError(
            "Camera permission was blocked. Enable it in your browser site settings and reload."
          );
        } else if (/notfound|nodevice|no cameras/i.test(msg)) {
          setError("No camera detected on this device.");
        } else if (/secure context|https/i.test(msg)) {
          setError("Camera requires HTTPS. Run `npm run start:https` or use a tunnel.");
        } else {
          setError(msg);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (!s) return;
      try {
        if (s.isScanning) {
          s.stop()
            .then(() => s.clear())
            .catch(() => {});
        } else {
          s.clear();
        }
      } catch {}
    };
  }, []);

  const submitManual = (e) => {
    e.preventDefault();
    const code = manual.trim();
    if (!code) return;
    onDetectedRef.current?.(code);
  };

  return (
    <div className="relative bg-black">
      <div id={READER_ID} className="w-full min-h-[60vh]" />

      {/* Scan box overlay hint */}
      {!error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[85vw] max-w-md aspect-[16/10] border-2 border-white/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      )}

      {starting && !error && (
        <div className="absolute top-3 inset-x-0 text-center text-white text-sm">
          Starting camera…
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 text-white px-6 text-center">
          <p className="text-lg font-medium mb-2">Camera unavailable</p>
          <p className="text-sm text-white/80 mb-6">{error}</p>
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded bg-white text-black font-medium"
          >
            Go back
          </button>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent space-y-3">
        <form onSubmit={submitManual} className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Enter barcode manually"
            className="flex-1 rounded-lg px-3 py-2 text-base bg-white/95"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium"
          >
            Use
          </button>
        </form>
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-2 rounded-lg bg-white/90 text-black"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
